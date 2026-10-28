package br.com.abencoada.diesel;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
public class MainActivity extends BridgeActivity {
 @Override public void onCreate(Bundle state){registerPlugin(OfflineSyncPlugin.class);registerPlugin(DeliveryNotifications.class);registerPlugin(AppAppearance.class);super.onCreate(state);}
}
