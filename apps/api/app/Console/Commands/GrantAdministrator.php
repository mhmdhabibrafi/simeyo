<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class GrantAdministrator extends Command
{
    protected $signature = 'ruang:grant-admin {email} {--super} {--confirm-reviewed : Operator confirms independent affiliation review}';

    protected $description = 'Grant an administrator role through trusted server access, with an audit record';

    public function handle(): int
    {
        if (! $this->option('confirm-reviewed')) {
            $this->error('Independent membership review must be confirmed with --confirm-reviewed.');

            return self::FAILURE;
        }
        $u = User::where('email', strtolower($this->argument('email')))->first();
        if (! $u || ! $u->hasVerifiedEmail() || ! $u->affiliation || ! $u->onboarded_at) {
            $this->error('Existing email-verified, onboarded account with institution required.');

            return self::FAILURE;
        }
        DB::transaction(function () use ($u) {
            $role = $this->option('super') ? 'super_administrator' : 'administrator';
            $u->forceFill(['role' => $role, 'verification_state' => 'approved'])->save();
            DB::table('audit_logs')->insert(['actor_id' => null, 'subject_id' => $u->id, 'action' => 'administrator.granted-cli', 'metadata' => json_encode(['role' => $role, 'source' => 'trusted-server-cli']), 'created_at' => now()]);
        });
        $this->info('Administrator granted. Audit record saved.');

        return self::SUCCESS;
    }
}
