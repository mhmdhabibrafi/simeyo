<?php

namespace App\Http\Controllers;

use App\Models\CampusEvent;
use App\Services\CampusSpaces;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class EventController extends Controller
{
    public function __construct(private CampusSpaces $spaces) {}

    private function resource(Request $r, CampusEvent $e): array
    {
        return $e->toArray() + ['going_count' => DB::table('event_attendees')->where('campus_event_id', $e->id)->where('state', 'going')->count(), 'rsvp' => DB::table('event_attendees')->where('campus_event_id', $e->id)->where('user_id', $r->user()->id)->value('state')];
    }

    public function index(Request $r)
    {
        $page = $this->spaces->events($r->user())->where('ends_at', '>=', now())->orderBy('starts_at')->orderBy('id')->cursorPaginate(20);

        return ['data' => $page->map(fn ($e) => $this->resource($r, $e)), 'next_cursor' => $page->nextCursor()?->encode()];
    }

    public function show(Request $r, int $event)
    {
        return ['data' => $this->resource($r, $this->spaces->events($r->user())->findOrFail($event))];
    }

    public function store(Request $r)
    {
        $d = $this->data($r);
        $e = CampusEvent::create($d + ['institution_id' => $r->user()->affiliation->institution_id, 'user_id' => $r->user()->id]);

        return response()->json(['data' => $this->resource($r, $e->refresh())], 201);
    }

    private function data(Request $r): array
    {
        $d = $r->validate(['title' => 'required|string|max:120', 'description' => 'required|string|max:3000', 'location' => 'required|string|max:200', 'starts_at' => 'required|date', 'ends_at' => 'required|date|after:starts_at', 'community_id' => 'nullable|integer']);
        if (isset($d['community_id'])) {
            $c = $this->spaces->visibleCommunities($r->user())->findOrFail($d['community_id']);
            $this->spaces->assertManager($r->user(), $c);
        }

        return $d;
    }

    public function update(Request $r, int $event)
    {
        $e = $this->spaces->events($r->user())->findOrFail($event);
        abort_unless($e->user_id === $r->user()->id, 403);
        $e->update($this->data($r));

        return ['data' => $this->resource($r, $e)];
    }

    public function destroy(Request $r, int $event)
    {
        $e = $this->spaces->events($r->user())->findOrFail($event);
        abort_unless($e->user_id === $r->user()->id, 403);
        $e->delete();

        return response()->noContent();
    }

    public function rsvp(Request $r, int $event)
    {
        $e = $this->spaces->events($r->user())->findOrFail($event);
        if ($r->isMethod('delete')) {
            DB::table('event_attendees')->where('campus_event_id', $e->id)->where('user_id', $r->user()->id)->delete();
        } else {
            $d = $r->validate(['state' => 'required|in:going,interested']);
            DB::table('event_attendees')->upsert([['campus_event_id' => $e->id, 'user_id' => $r->user()->id, 'state' => $d['state'], 'created_at' => now(), 'updated_at' => now()]], ['campus_event_id', 'user_id'], ['state', 'updated_at']);
        }

        return ['data' => $this->resource($r, $e)];
    }
}
