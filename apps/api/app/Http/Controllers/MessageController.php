<?php

namespace App\Http\Controllers;

use App\Events\ActivityChanged;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use App\Services\CampusActivity;
use App\Services\ConversationAccess;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MessageController extends Controller
{
    public function __construct(private ConversationAccess $access) {}

    public function index(Request $r)
    {
        $u = $r->user();
        $q = Conversation::where('institution_id', $u->affiliation->institution_id)->whereHas('participants', fn ($p) => $p->where('users.id', $u->id));
        $q->whereHas('participants', fn ($p) => $p->where('users.id', '!=', $u->id)->where('verification_state', 'approved')->whereNotNull('email_verified_at')->whereHas('affiliation', fn ($a) => $a->where('institution_id', $u->affiliation->institution_id))->whereNotIn('users.id', DB::table('blocks')->select('target_id')->where('user_id', $u->id))->whereNotIn('users.id', DB::table('blocks')->select('user_id')->where('target_id', $u->id)));
        $page = $q->with('participants.profile')->withCount(['messages as unread_count' => fn ($m) => $m->where('sender_id', '!=', $u->id)->where('messages.id', '>', function ($s) use ($u) {
            $s->select('last_read_message_id')->from('conversation_participants')->whereColumn('conversation_participants.conversation_id', 'conversations.id')->where('user_id', $u->id);
        })])->orderByDesc('id')->cursorPaginate(20);

        return ['data' => $page->map(fn ($c) => ['id' => $c->id, 'user' => $c->participants->firstWhere('id', '!=', $u->id)->only('id', 'name', 'username'), 'unread_count' => $c->unread_count]), 'next_cursor' => $page->nextCursor()?->encode()];
    }

    public function start(Request $r)
    {
        $d = $r->validate(['user_id' => 'required|integer|min:1']);
        $other = User::findOrFail($d['user_id']);
        abort_if($other->id === $r->user()->id, 422, 'Pilih penerima lain.');
        abort_unless($this->access->canSend($r->user(), $other), 403, 'Penerima membatasi pesan baru.');
        $ids = [$r->user()->id, $other->id];
        sort($ids);
        $c = DB::transaction(function () use ($r, $ids) {
            DB::table('users')->whereIn('id', $ids)->orderBy('id')->lockForUpdate()->get();
            $c = Conversation::firstOrCreate(['first_user_id' => $ids[0], 'second_user_id' => $ids[1]], ['institution_id' => $r->user()->affiliation->institution_id]);
            foreach ($ids as $id) {
                DB::table('conversation_participants')->insertOrIgnore(['conversation_id' => $c->id, 'user_id' => $id]);
            }

            return $c;
        });

        return response()->json(['data' => ['id' => $c->id]], 201);
    }

    public function show(Request $r, int $conversation)
    {
        $c = $this->access->find($r->user(), $conversation);
        $other = $c->participants->firstWhere('id', '!=', $r->user()->id);
        $page = $c->messages()->orderByDesc('id')->cursorPaginate(30);

        return ['data' => $page->items(), 'user' => $other->only('id', 'name', 'username'), 'next_cursor' => $page->nextCursor()?->encode(), 'can_send' => $this->access->canSend($r->user(), $other)];
    }

    public function store(Request $r, int $conversation)
    {
        $d = $r->validate(['body' => 'required|string|max:2000', 'client_id' => 'required|uuid']);
        $message = DB::transaction(function () use ($r, $conversation, $d) {
            $c = $this->access->find($r->user(), $conversation);
            DB::table('users')->whereIn('id', [$c->first_user_id, $c->second_user_id])->orderBy('id')->lockForUpdate()->get();
            $c = $this->access->find($r->user(), $conversation);
            $other = $c->participants->firstWhere('id', '!=', $r->user()->id);
            abort_unless($this->access->canSend($r->user(), $other), 403, 'Penerima membatasi pesan.');
            $existing = Message::where('sender_id', $r->user()->id)->where('client_id', $d['client_id'])->first();
            if ($existing) {
                abort_unless($existing->conversation_id === $c->id && $existing->body === trim($d['body']), 409, 'Identitas pesan sudah digunakan.');

                return $existing;
            }
            $m = Message::create(['sender_id' => $r->user()->id, 'conversation_id' => $c->id, 'client_id' => $d['client_id'], 'body' => trim($d['body'])]);
            app(CampusActivity::class)->send($other, $r->user(), 'messages', ['conversation_id' => $c->id]);
            ActivityChanged::dispatch($r->user()->id);

            return $m;
        });

        return response()->json(['data' => $message], 201);
    }

    public function read(Request $r, int $conversation)
    {
        $c = $this->access->find($r->user(), $conversation);
        $id = $c->messages()->max('id') ?? 0;
        DB::table('conversation_participants')->where('conversation_id', $c->id)->where('user_id', $r->user()->id)->where('last_read_message_id', '<', $id)->update(['last_read_message_id' => $id]);

        return response()->noContent();
    }
}
