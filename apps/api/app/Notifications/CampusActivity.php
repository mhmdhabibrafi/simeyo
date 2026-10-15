<?php

namespace App\Notifications;

use Illuminate\Notifications\Notification;

class CampusActivity extends Notification
{
    public function __construct(private array $activity) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return $this->activity;
    }
}
