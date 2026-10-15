<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $owner = $request->user()?->id === $this->id;
        $p = $this->profile;
        $a = $this->affiliation;
        $academic = ($owner || $p?->academic_visible) && $a;

        return ['id' => $this->id, 'name' => $this->name, 'username' => $this->username, 'verified' => $this->verification_state === 'approved',
            'bio' => $p?->bio, 'location' => $p?->location, 'avatar_url' => $p?->avatar_path ? '/media/'.$p->avatar_path : null, 'cover_url' => $p?->cover_path ? '/media/'.$p->cover_path : null,
            'links' => $p?->links ?? [], 'interests' => $p?->interests ?? [], 'academic_visible' => (bool) $p?->academic_visible, 'private_account' => (bool) $p?->private_account,
            'institution' => $a?->institution?->only(['id', 'name', 'slug']),
            'faculty' => $academic ? $a->faculty?->name : null,
            'department' => $academic ? $a->department?->name : null,
            'cohort' => $academic ? $a->cohort?->year : null,
            'affiliation' => $academic ? $a->only(['faculty_id', 'department_id', 'academic_cohort_id']) : null,
            $this->mergeWhen(array_key_exists('social_followers', $this->resource->getAttributes()), ['relationship' => ['followers_count' => (int) $this->social_followers, 'following_count' => (int) $this->social_following, 'follow_state' => $this->social_state, 'muted' => (bool) $this->social_muted]]),
            $this->mergeWhen($owner, ['email' => $this->email, 'email_verified' => $this->hasVerifiedEmail(), 'verification_state' => $this->verification_state, 'onboarded' => (bool) $this->onboarded_at, 'can_review_verifications' => $this->isAdministrator(), 'can_moderate' => in_array($this->role, ['moderator', 'administrator', 'super_administrator'], true)])];
    }
}
