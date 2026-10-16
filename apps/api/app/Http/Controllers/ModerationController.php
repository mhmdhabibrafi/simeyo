<?php

namespace App\Http\Controllers;

use App\Models\Community;
use App\Models\Post;
use App\Models\User;
use App\Services\CampusActivity;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ModerationController extends Controller
{
    private function authorize(Request $r): void
    {
        abort_unless(in_array($r->user()->role, ['moderator', 'administrator', 'super_administrator'], true), 403);
    }

    private function reports(Request $r)
    {
        return DB::table('reports')->join('posts', 'posts.id', '=', 'reports.post_id')->where('posts.institution_id', $r->user()->affiliation->institution_id);
    }

    public function index(Request $r)
    {
        $this->authorize($r);
        $p = $this->reports($r)->where('reports.state', 'pending')->select('reports.*', 'posts.body', 'posts.user_id as author_id')->orderBy('reports.id')->cursorPaginate(20);

        return ['data' => $p->items(), 'next_cursor' => $p->nextCursor()?->encode(), 'stats' => ['pending_reports' => $this->reports($r)->where('reports.state', 'pending')->count(), 'active_members' => User::where('verification_state', 'approved')->whereHas('affiliation', fn ($q) => $q->where('institution_id', $r->user()->affiliation->institution_id))->count(), 'communities' => Community::where('institution_id', $r->user()->affiliation->institution_id)->count()]];
    }

    public function review(Request $r, int $report)
    {
        $this->authorize($r);
        $d = $r->validate(['action' => 'required|in:dismiss,remove,suspend', 'note' => 'required|string|min:10|max:1000']);
        DB::transaction(function () use ($r, $report, $d) {
            $v = $this->reports($r)->where('reports.id', $report)->select('reports.*', 'posts.user_id as author_id')->lockForUpdate()->first();
            abort_unless($v, 404);
            abort_unless($v->state === 'pending', 409, 'Laporan sudah ditinjau.');
            abort_if($v->author_id === $r->user()->id, 403, 'Laporan sendiri memerlukan reviewer lain.');
            $u = User::whereKey($v->author_id)->lockForUpdate()->firstOrFail();
            if ($d['action'] === 'suspend') {
                abort_unless($r->user()->isAdministrator() && ! in_array($u->role, ['moderator', 'administrator', 'super_administrator'], true), 403);
                $u->forceFill(['verification_state' => 'suspended'])->save();
                $u->verificationRequest?->update(['state' => 'suspended', 'review_note' => $d['note'], 'reviewed_by' => $r->user()->id, 'reviewed_at' => now()]);
                $u->tokens()->delete();
                DB::table('sessions')->where('user_id', $u->id)->delete();
            }
            if ($d['action'] === 'remove') {
                Post::withTrashed()->findOrFail($v->post_id)->delete();
            }
            DB::table('reports')->where('id', $v->id)->update(['state' => $d['action'] === 'dismiss' ? 'dismissed' : 'actioned', 'resolution' => $d['action'], 'review_note' => $d['note'], 'reviewed_by' => $r->user()->id, 'reviewed_at' => now(), 'updated_at' => now()]);
            DB::table('audit_logs')->insert(['actor_id' => $r->user()->id, 'subject_id' => $u->id, 'action' => 'moderation.'.$d['action'], 'metadata' => json_encode(['report_id' => $v->id, 'post_id' => $v->post_id, 'note' => $d['note']]), 'created_at' => now()]);
            app(CampusActivity::class)->send(User::findOrFail($v->user_id), $r->user(), 'moderation', ['message' => 'Laporanmu telah ditinjau. Keputusan: '.$d['action'].'.']);
            if ($d['action'] !== 'dismiss') {
                app(CampusActivity::class)->send($u, $r->user(), 'moderation', ['message' => 'Tindakan moderasi: '.$d['action'].'. '.$d['note']]);
            }
        });

        return response()->noContent();
    }

    public function messageReports(Request $r)
    {
        $this->authorize($r);
        $r->validate(['cursor' => 'nullable|string|max:4096']);
        $page = DB::table('conversation_reports')->join('users as reporter', 'reporter.id', '=', 'conversation_reports.user_id')->join('users as author', 'author.id', '=', 'conversation_reports.reported_user_id')->where('conversation_reports.institution_id', $r->user()->affiliation->institution_id)->where('conversation_reports.state', 'pending')->select('conversation_reports.*', 'reporter.name as reporter_name', 'author.name as author_name')->orderBy('conversation_reports.id')->cursorPaginate(20);

        return ['data' => $page->items(), 'next_cursor' => $page->nextCursor()?->encode()];
    }

    public function reviewMessage(Request $r, int $report)
    {
        $this->authorize($r);
        $d = $r->validate(['action' => 'required|in:dismiss,warn,suspend', 'note' => 'required|string|min:10|max:1000']);
        DB::transaction(function () use ($r, $report, $d) {
            $entry = DB::table('conversation_reports')->where('institution_id', $r->user()->affiliation->institution_id)->where('id', $report)->lockForUpdate()->first();
            abort_unless($entry, 404);
            abort_unless($entry->state === 'pending', 409, 'Laporan sudah ditinjau.');
            abort_if(in_array($r->user()->id, [(int) $entry->user_id, (int) $entry->reported_user_id], true), 403, 'Laporan sendiri memerlukan reviewer lain.');
            $author = User::whereKey($entry->reported_user_id)->lockForUpdate()->firstOrFail();
            if ($d['action'] !== 'dismiss') {
                abort_unless($author->affiliation?->institution_id === $r->user()->affiliation->institution_id, 403, 'Akun tidak lagi berada di kampus ini.');
            }
            if ($d['action'] === 'suspend') {
                abort_unless($r->user()->isAdministrator() && ! in_array($author->role, ['moderator', 'administrator', 'super_administrator'], true), 403);
                $author->forceFill(['verification_state' => 'suspended'])->save();
                $author->verificationRequest?->update(['state' => 'suspended', 'review_note' => $d['note'], 'reviewed_by' => $r->user()->id, 'reviewed_at' => now()]);
                $author->tokens()->delete();
                DB::table('sessions')->where('user_id', $author->id)->delete();
            }
            DB::table('conversation_reports')->where('id', $entry->id)->update(['state' => $d['action'] === 'dismiss' ? 'dismissed' : 'actioned', 'resolution' => $d['action'], 'review_note' => $d['note'], 'reviewed_by' => $r->user()->id, 'reviewed_at' => now(), 'updated_at' => now()]);
            DB::table('audit_logs')->insert(['actor_id' => $r->user()->id, 'subject_id' => $author->id, 'action' => 'moderation.message.'.$d['action'], 'metadata' => json_encode(['report_id' => $entry->id, 'note' => $d['note']]), 'created_at' => now()]);
            app(CampusActivity::class)->send(User::findOrFail($entry->user_id), $r->user(), 'moderation', ['message' => 'Laporan pesanmu telah ditinjau. Keputusan: '.$d['action'].'.']);
            if ($d['action'] !== 'dismiss') {
                app(CampusActivity::class)->send($author, $r->user(), 'moderation', ['message' => 'Tindakan moderasi pesan: '.$d['action'].'. '.$d['note']]);
            }
        });

        return response()->noContent();
    }

    public function organizations(Request $r)
    {
        $this->authorize($r);
        abort_unless($r->user()->isAdministrator(), 403);

        return ['data' => Community::where('institution_id', $r->user()->affiliation->institution_id)->where('organization_requested', true)->where('organization_verified', false)->orderBy('id')->limit(30)->get(['id', 'name', 'owner_id'])];
    }

    public function verify(Request $r, int $community)
    {
        $this->authorize($r);
        abort_unless($r->user()->isAdministrator(), 403);
        $r->validate(['note' => 'required|string|min:10|max:1000']);
        DB::transaction(function () use ($r, $community) {
            $c = Community::where('institution_id', $r->user()->affiliation->institution_id)->lockForUpdate()->findOrFail($community);
            $u = User::findOrFail($c->owner_id);
            abort_if($u->id === $r->user()->id, 403);
            abort_unless($u->role === 'organization_manager' && $u->verification_state === 'approved' && $c->organization_requested, 422, 'Pemilik organisasi harus memiliki afiliasi organisasi yang disetujui.');
            $c->update(['organization_verified' => true]);
            DB::table('audit_logs')->insert(['actor_id' => $r->user()->id, 'subject_id' => $u->id, 'action' => 'community.verified', 'metadata' => json_encode(['community_id' => $c->id, 'note' => $r->input('note')]), 'created_at' => now()]);
        });

        return response()->noContent();
    }
}
