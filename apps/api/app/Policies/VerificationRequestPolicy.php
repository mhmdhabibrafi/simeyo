<?php

namespace App\Policies;

use App\Models\User;
use App\Models\VerificationRequest;

class VerificationRequestPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->isAdministrator() && $user->hasVerifiedEmail() && $user->verification_state === 'approved';
    }

    public function update(User $user, VerificationRequest $verificationRequest): bool
    {
        return $this->viewAny($user) && $user->id !== $verificationRequest->user_id && ($user->role === 'super_administrator' || $user->affiliation?->institution_id === $verificationRequest->user->affiliation?->institution_id);
    }
}
