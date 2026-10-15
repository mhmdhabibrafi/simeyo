<?php
require __DIR__.'/../../apps/api/vendor/autoload.php';
$app=require __DIR__.'/../../apps/api/bootstrap/app.php';$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();
if(!app()->environment('local'))throw new RuntimeException('Social browser fixture requires local environment.');
$suffix=$argv[1]??'';if(!preg_match('/^[a-z0-9]{1,12}$/',$suffix))throw new RuntimeException('Invalid synthetic fixture suffix.');
$institution=\App\Models\Institution::where('slug','uin-suska-riau')->firstOrFail();$password=env('DEMO_PASSWORD');if(!$password)throw new RuntimeException('Local demo password required.');
$users=[];
foreach(['a'=>'Alya Pengujian','b'=>'Bima Pengujian'] as $key=>$name){$username='e2e_s'.$suffix.'_'.$key;$u=\App\Models\User::create(['name'=>$name,'username'=>$username,'email'=>$username.'@example.test','password'=>$password]);$u->forceFill(['verification_state'=>'approved','email_verified_at'=>now(),'onboarded_at'=>now()])->save();$u->profile()->create(['bio'=>'Akun fiktif khusus pengujian social core.']);$u->affiliation()->create(['institution_id'=>$institution->id]);$users[$key]=['id'=>$u->id,'username'=>$username,'email'=>$u->email];}
if(($argv[2]??'')==='timeline'){
 $users['a']['post_ids']=[];
 for($i=0;$i<18;$i++){$p=new \App\Models\Post(['body'=>'Cerita pagination '.$suffix.' #'.$i,'visibility'=>'campus']);$p->forceFill(['user_id'=>$users['a']['id'],'institution_id'=>$institution->id])->save();$users['a']['post_ids'][]=$p->id;}
}
echo json_encode($users);
