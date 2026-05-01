package ke.elevate.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;
import com.getcapacitor.annotation.CapacitorPlugin;

public class MainActivity extends BridgeActivity {
    
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Enable JavaScript and DOM storage
        this.getBridge().getWebView().getSettings().setJavaScriptEnabled(true);
        this.getBridge().getWebView().getSettings().setDomStorageEnabled(true);
        this.getBridge().getWebView().getSettings().setDatabaseEnabled(true);
        
        // Enable zoom controls
        this.getBridge().getWebView().getSettings().setBuiltInZoomControls(true);
        this.getBridge().getWebView().getSettings().setDisplayZoomControls(false);
        
        // Enable file access from file URLs
        this.getBridge().getWebView().getSettings().setAllowFileAccess(true);
        this.getBridge().getWebView().getSettings().setAllowContentAccess(true);
    }
}
