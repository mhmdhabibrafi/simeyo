<?php

namespace App\Http\Controllers;

use App\Models\Community;
use App\Models\User;
use App\Services\CampusSpaces;
use App\Services\PostVisibility;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CommunityController extends Controller
{
    public function __construct(private CampusSpaces $spaces) {}

    public function index(Request $r)
    {
        $d = $r->validate(['q' => 'nullable|string|max:80', 'cursor' => 'nullable|string|max:4096']);
        $q = $this->spaces->communities($r->user());
        if ($r->boolean('managed')) {
            $q->whereHas('members', fn ($m) => $m->where('users.id', $r->user()->id)->where('community_members.state', 'active')->whereIn('community_members.role', ['owner', 'moderator']));
        }
        if (! empty($d['q'])) {
            $q->whereRaw('LOWER(name) LIKE ?', ['%'.mb_strtolower($d['q']).'%']);
        }
        $page = $q->withCount(['members as members_count' => fn ($m) => $m->where('community_members.state', 'active')])->with(['members' => fn ($m) => $m->where('users.id', $r->user()->id)])->orderByDesc('id')->cursorPaginate(20);

        return ['data' => $page->map(fn ($c) => $this->resource($r, $c)), 'next_cursor' => $page->nextCursor()?->encode()];
    }

    private function resource(Request $r, Community $c): array
    {
        return $c->only('id', 'name', 'description', 'rules', 'visibility', 'faculty_id', 'department_id', 'owner_id', 'organization_verified') + ['membership' => $c->relationLoaded('members') ? $c->members->first()?->pivot : $this->spaces->membership($r->user(), $c), 'members_count' => $c->members_count ?? DB::table('community_members')->where('community_id', $c->id)->where('state', 'active')->count()];
    }

    public function show(Request $r, int $community)
    {
        return ['data' => $this->resource($r, $this->spaces->communities($r->user())->findOrFail($community))];
    }

    public function store(Request $r)
    {
        $d = $this->validateData($r);
        $c = DB::transaction(function () use ($r, $d) {
            $c = Community::create($d + ['institution_id' => $r->user()->affiliation->institution_id, 'owner_id' => $r->user()->id]);
            DB::table('community_members')->insert(['community_id' => $c->id, 'user_id' => $r->user()->id, 'role' => 'owner', 'state' => 'active', 'created_at' => now(), 'updated_at' => now()]);

            return $c;
        });

        return response()->json(['data' => $this->resource($r, $c->refresh())], 201);
    }

    private function validateData(Request $r): array
    {
        $d = $r->validate(['name' => 'required|string|max:80', 'description' => 'required|string|max:1500', 'rules' => 'nullable|string|max:1500', 'visibility' => 'required|in:campus,private', 'faculty_id' => 'nullable|integer', 'department_id' => 'nullable|integer', 'organization_requested' => 'sometimes|boolean']);
        if (isset($d['faculty_id'])) {
            abort_unless(DB::table('faculties')->where('id', $d['faculty_id'])->where('institution_id', $r->user()->affiliation->institution_id)->exists(), 422, 'Fakultas tidak tersedia.');
        }
        if (isset($d['department_id'])) {
            abort_unless(isset($d['faculty_id']) && DB::table('departments')->where('id', $d['department_id'])->where('faculty_id', $d['faculty_id'])->exists(), 422, 'Program studi tidak sesuai fakultas.');
        }

        return $d;
    }

    public function update(Request $r, int $community)
    {
        $c = $this->spaces->communities($r->user())->findOrFail($community);
        $this->spaces->assertManager($r->user(), $c);
        $c->update($this->validateData($r));

        return ['data' => $this->resource($r, $c)];
    }

    public function destroy(Request $r, int $community)
    {
        $c = $this->spaces->communities($r->user())->findOrFail($community);
        abort_unless($c->owner_id === $r->user()->id, 403);
        $c->delete();

        return response()->noContent();
    }

    public function join(Request $r, int $community)
    {
        $c = $this->spaces->communities($r->user())->findOrFail($community);
        DB::transaction(function () use ($r, $c) {
            DB::table('communities')->where('id', $c->id)->lockForUpdate()->first();
            $m = $this->spaces->membership($r->user(), $c);
            if ($r->isMethod('delete')) {
                abort_if($c->owner_id === $r->user()->id, 422, 'Pemilik harus menghapus komunitas atau mentransfer kepemilikan.');
                DB::table('community_members')->where('community_id', $c->id)->where('user_id', $r->user()->id)->delete();
            } elseif (! $m) {
                DB::table('community_members')->insert(['community_id' => $c->id, 'user_id' => $r->user()->id, 'state' => $c->visibility === 'private' ? 'pending' : 'active', 'role' => 'member', 'created_at' => now(), 'updated_at' => now()]);
            }
        });

        return ['data' => $this->resource($r, $c)];
    }

    public function members(Request $r, int $community)
    {
        $c = $this->spaces->visibleCommunities($r->user())->findOrFail($community);
        $m = $this->spaces->membership($r->user(), $c);
        $manage = $m?->state === 'active' && in_array($m->role, ['owner', 'moderator'], true);
        $q = $c->members()->where('verification_state', 'approved')->whereNotNull('email_verified_at')->whereHas('affiliation', fn ($a) => $a->where('institution_id', $r->user()->affiliation->institution_id))->whereNotIn('users.id', DB::table('blocks')->select('target_id')->where('user_id', $r->user()->id))->whereNotIn('users.id', DB::table('blocks')->select('user_id')->where('target_id', $r->user()->id));
        if (! $manage) {
            $q->where('community_members.state', 'active');
        }
        $p = $q->orderBy('users.id')->cursorPaginate(30, ['users.id', 'users.name', 'users.username']);

        return ['data' => $p->items(), 'next_cursor' => $p->nextCursor()?->encode()];
    }

    public function member(Request $r, int $community, int $user)
    {
        $c = $this->spaces->communities($r->user())->findOrFail($community);
        $this->spaces->assertManager($r->user(), $c);
        $d = $r->validate(['action' => 'required|in:accept,remove,promote,demote']);
        abort_if($user === $c->owner_id, 422, 'Pemilik tidak dapat diubah melalui tindakan ini.');
        DB::transaction(function () use ($r, $c, $user, $d) {
            DB::table('communities')->where('id', $c->id)->lockForUpdate()->first();
            $this->spaces->assertManager($r->user(), $c);
            $q = DB::table('community_members')->where('community_id', $c->id)->where('user_id', $user);
            $target = $q->first();
            abort_unless($target, 404);
            if ($d['action'] !== 'accept') {
                abort_unless($r->user()->id === $c->owner_id || $target->role === 'member' && $d['action'] === 'remove', 403);
            }switch ($d['action']) {
                case 'accept':app(PostVisibility::class)->assertProfile($r->user(), User::findOrFail($user));
                    $q->where('state', 'pending')->update(['state' => 'active', 'updated_at' => now()]);
                    break;
                case 'remove':$q->delete();
                    break;
                default:abort_unless($target->state === 'active', 422);
                    $q->update(['role' => $d['action'] === 'promote' ? 'moderator' : 'member', 'updated_at' => now()]);
            }
        });

        return response()->noContent();
    }
}
