package br.com.abencoada.diesel;

import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;
import android.graphics.drawable.Drawable;
import android.view.View;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name="AppAppearance")
public class AppAppearance extends Plugin {
 @PluginMethod public void apply(PluginCall call){
  getActivity().runOnUiThread(()->{
   // Old WebViews reserve native space for system bars; modern ones draw the
   // page beneath them. Keep the native inset in the same palette as the header.
   View decor=getActivity().getWindow().getDecorView();
   int color=Color.WHITE;
   Drawable background=decor.getBackground();
   if(!(background instanceof ColorDrawable)||((ColorDrawable)background).getColor()!=color)decor.setBackgroundColor(color);
   call.resolve();
  });
 }
}
