package expo.modules.bleadvertiser

import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothManager
import android.bluetooth.le.AdvertiseCallback
import android.bluetooth.le.AdvertiseData
import android.bluetooth.le.AdvertiseSettings
import android.bluetooth.le.BluetoothLeAdvertiser
import android.content.Context
import android.os.ParcelUuid
import android.util.Log
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise
import java.util.UUID

class BleAdvertiserModule : Module() {
  private var advertiser: BluetoothLeAdvertiser? = null
  private var advertiseCallback: AdvertiseCallback? = null
  private val TAG = "BleAdvertiserModule"

  override fun definition() = ModuleDefinition {
    Name("BleAdvertiser")

    AsyncFunction("startAdvertising") { serviceUuidString: String, studentId: String, promise: Promise ->
      try {
        val bluetoothManager = appContext.reactContext?.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
        
        if (bluetoothManager == null) {
          promise.reject("ERROR", "Bluetooth manager not available", null)
          return@AsyncFunction
        }

        val bluetoothAdapter = bluetoothManager.adapter
        
        if (bluetoothAdapter == null || !bluetoothAdapter.isEnabled) {
          promise.reject("ERROR", "Bluetooth is not enabled", null)
          return@AsyncFunction
        }

        advertiser = bluetoothAdapter.bluetoothLeAdvertiser
        
        if (advertiser == null) {
          promise.reject("ERROR", "Bluetooth LE Advertiser not available", null)
          return@AsyncFunction
        }

        // Parse UUID
        val serviceUuid = UUID.fromString(serviceUuidString)
        val pUuid = ParcelUuid(serviceUuid)

        // Build advertise settings - use legacy mode for compatibility
        val settings = AdvertiseSettings.Builder()
          .setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY)
          .setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_HIGH)
          .setConnectable(false)
          .setTimeout(0) // Advertise indefinitely
          .build()

        // Build advertise data - use device name instead of service data (saves bytes)
        // Device name can be up to 248 bytes in extended advertising
        val data = AdvertiseData.Builder()
          .setIncludeDeviceName(true) // Include device name with student ID
          .addServiceUuid(pUuid)
          .setIncludeTxPowerLevel(false) // Save bytes
          .build()

        // Set device name to student ID
        try {
          bluetoothAdapter.name = studentId
        } catch (e: Exception) {
          Log.w(TAG, "Could not set device name: ${e.message}")
        }

        // Create callback
        advertiseCallback = object : AdvertiseCallback() {
          override fun onStartSuccess(settingsInEffect: AdvertiseSettings?) {
            super.onStartSuccess(settingsInEffect)
            Log.d(TAG, "Advertising started successfully with device name: $studentId")
          }

          override fun onStartFailure(errorCode: Int) {
            super.onStartFailure(errorCode)
            Log.e(TAG, "Advertising failed with error code: $errorCode")
          }
        }

        // Start advertising
        advertiser?.startAdvertising(settings, data, advertiseCallback)
        
        promise.resolve("Advertising started")
        Log.d(TAG, "Started advertising with Service UUID: $serviceUuidString and student ID: $studentId")

      } catch (e: Exception) {
        Log.e(TAG, "Error starting advertising", e)
        promise.reject("ERROR", e.message, e)
      }
    }

    AsyncFunction("stopAdvertising") { promise: Promise ->
      try {
        if (advertiser != null && advertiseCallback != null) {
          advertiser?.stopAdvertising(advertiseCallback)
          Log.d(TAG, "Advertising stopped")
          promise.resolve("Advertising stopped")
        } else {
          promise.resolve("No active advertising")
        }
      } catch (e: Exception) {
        Log.e(TAG, "Error stopping advertising", e)
        promise.reject("ERROR", e.message, e)
      }
    }
  }
}
