package br.com.abencoada.diesel;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.*;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import org.json.*;
import java.util.*;

@CapacitorPlugin(name="DeliveryNotifications",permissions={@Permission(alias="delivery",strings={Manifest.permission.POST_NOTIFICATIONS})})
public class DeliveryNotifications extends Plugin {
 private static final String CHANNEL="confirmed-deliveries";
 private static final int NOTIFICATION_ID=26028;
 private static void channel(Context context){
  NotificationChannel channel=new NotificationChannel(CHANNEL,"Registros enviados",NotificationManager.IMPORTANCE_DEFAULT);
  channel.setDescription("Confirmações de recebimento dos registros enviados pelo Abençoada.");
  context.getSystemService(NotificationManager.class).createNotificationChannel(channel);
 }
 private static boolean enabled(Context context){
  if(Build.VERSION.SDK_INT>=33&&ContextCompat.checkSelfPermission(context,Manifest.permission.POST_NOTIFICATIONS)!=PackageManager.PERMISSION_GRANTED)return false;
  NotificationChannel channel=context.getSystemService(NotificationManager.class).getNotificationChannel(CHANNEL);
  return NotificationManagerCompat.from(context).areNotificationsEnabled()&&(channel==null||channel.getImportance()!=NotificationManager.IMPORTANCE_NONE);
 }
 @PluginMethod public void status(PluginCall call){channel(getContext());call.resolve(new JSObject().put("enabled",enabled(getContext())));}
 @PluginMethod public void request(PluginCall call){
  channel(getContext());
  if(Build.VERSION.SDK_INT>=33&&getPermissionState("delivery")!=PermissionState.GRANTED){requestPermissionForAlias("delivery",call,"permissionResult");return;}
  call.resolve(new JSObject().put("enabled",enabled(getContext())));
 }
 @PermissionCallback private void permissionResult(PluginCall call){call.resolve(new JSObject().put("enabled",enabled(getContext())));}
 @PluginMethod public void delivered(PluginCall call){
  JSONArray ids=call.getArray("ids");String user=call.getString("userId","");
  if(ids==null||user.isEmpty()){call.reject("Confirmação de envio inválida.");return;}
  List<String> confirmed=new ArrayList<>();for(int i=0;i<ids.length()&&i<1000;i++){String id=ids.optString(i,"");if(!id.isEmpty()&&id.length()<=128)confirmed.add(id);}
  showConfirmed(getContext(),user,confirmed);call.resolve();
 }
 static void showConfirmed(Context context,String user,List<String> confirmed){
  if(confirmed.isEmpty())return;
  try{synchronized(OfflineStore.LOCK){
   channel(context);if(!enabled(context))return;
   JSONObject state=OfflineStore.read(context);JSONArray ledger=state.optJSONArray("deliveryNotifiedIds");
   LinkedHashSet<String> notified=new LinkedHashSet<>();if(ledger!=null)for(int i=0;i<ledger.length();i++)notified.add(ledger.getString(i));
   int count=0;for(String id:confirmed)if(notified.add(user+":"+id))count++;
   if(count==0)return;
   while(notified.size()>4096)notified.remove(notified.iterator().next());
   JSONArray saved=new JSONArray();for(String id:notified)saved.put(id);
   state.put("deliveryNotifiedIds",saved);OfflineStore.write(context,state);
   Intent intent=context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
   if(intent==null)return;intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP|Intent.FLAG_ACTIVITY_SINGLE_TOP);
   PendingIntent open=PendingIntent.getActivity(context,0,intent,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
   android.app.Notification publicNotice=new NotificationCompat.Builder(context,CHANNEL).setSmallIcon(R.drawable.ic_delivery).setContentTitle("Abençoada").setContentText("Envio confirmado. Seus registros foram recebidos.").build();
   android.app.Notification notification=new NotificationCompat.Builder(context,CHANNEL).setSmallIcon(R.drawable.ic_delivery).setContentTitle(count==1?"Registro enviado":"Registros enviados")
    .setContentText(count==1?"A administração confirmou o recebimento do registro.":count+" registros recebidos pela administração.")
    .setContentIntent(open).setAutoCancel(true).setVisibility(NotificationCompat.VISIBILITY_PRIVATE).setPublicVersion(publicNotice).setPriority(NotificationCompat.PRIORITY_DEFAULT).build();
   NotificationManagerCompat.from(context).notify(NOTIFICATION_ID,notification);
  }}catch(Exception ignored){android.util.Log.w("Abencoada","Não foi possível mostrar a confirmação de envio.");}
 }
}
