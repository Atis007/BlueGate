import { useState, useRef, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, Text, Alert, Platform, PermissionsAndroid } from 'react-native';
import * as IntentLauncher from 'expo-intent-launcher';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/hooks/use-auth';

const SERVICE_UUID = process.env.EXPO_PUBLIC_APP_SERVICE_UUID || '';

export default function StudentIndex() {
  const { studentProfile, signOut } = useAuth();
  const [isAdvertising, setIsAdvertising] = useState(false);
  const [bleAvailable, setBleAvailable] = useState<boolean | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const blePeripheralRef = useRef<any>(null);

  // Generate the student identifier to broadcast
  const studentIdentifier = studentProfile?.indexNumber 
    ? `student${studentProfile.indexNumber}` 
    : '';

  useEffect(() => {
    // Try to initialize BLE peripheral
    const initBle = async () => {
      try {
        const BlePeripheral = await import('react-native-ble-peripheral');
        blePeripheralRef.current = BlePeripheral.default;
        setBleAvailable(true);
        setStatusMessage('Bluetooth elérhető');
      } catch (error) {
        console.log('BLE Peripheral not available:', error);
        setBleAvailable(false);
        setStatusMessage('BLE nem elérhető. Development build szükséges.');
      }
    };

    initBle();

    return () => {
      // Stop advertising on unmount
      if (blePeripheralRef.current && isAdvertising) {
        blePeripheralRef.current.stop();
      }
    };
  }, []);

  const requestPermissions = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;
    
    try {
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ]);
      
      return (
        granted['android.permission.BLUETOOTH_ADVERTISE'] === PermissionsAndroid.RESULTS.GRANTED &&
        granted['android.permission.ACCESS_FINE_LOCATION'] === PermissionsAndroid.RESULTS.GRANTED
      );
    } catch (err) {
      console.warn(err);
      return false;
    }
  };

  const handleLogout = async () => {
    if (isAdvertising) {
      await stopAdvertising();
    }
    await signOut();
  };

  const startAdvertising = async () => {
    if (!bleAvailable || !blePeripheralRef.current) {
      // Fallback: open Bluetooth settings
      Alert.alert(
        'Bluetooth nem elérhető',
        `Development build szükséges a BLE sugárzáshoz.\n\nSugárzandó adatok:\n- Service UUID: ${SERVICE_UUID}\n- Azonosító: ${studentIdentifier}`,
        [
          { text: 'Mégse', style: 'cancel' },
          {
            text: 'Bluetooth beállítások',
            onPress: async () => {
              if (Platform.OS === 'android') {
                await IntentLauncher.startActivityAsync(
                  IntentLauncher.ActivityAction.BLUETOOTH_SETTINGS
                );
              }
            },
          },
        ]
      );
      return;
    }

    try {
      // Request permissions first
      const hasPermission = await requestPermissions();
      if (!hasPermission) {
        Alert.alert('Hiba', 'Bluetooth engedélyek szükségesek a sugárzáshoz.');
        return;
      }

      const BlePeripheral = blePeripheralRef.current;
      
      // Add service with characteristic containing student identifier
      await BlePeripheral.addService(SERVICE_UUID, true);
      
      // Create characteristic UUID (we'll use a fixed one for the student ID data)
      const CHARACTERISTIC_UUID = '00002a00-0000-1000-8000-00805f9b34fb';
      
      // Add characteristic with student identifier as value
      await BlePeripheral.addCharacteristicToService(
        SERVICE_UUID,
        CHARACTERISTIC_UUID,
        16 | 1, // read + broadcast
        8 // readable permission
      );

      // Convert student identifier to bytes for service data
      const encoder = new TextEncoder();
      const studentIdBytes = Array.from(encoder.encode(studentIdentifier));

      // Start advertising with service data
      await BlePeripheral.start()
        .then(() => {
          console.log('BLE Advertising started successfully');
          console.log('Service UUID:', SERVICE_UUID);
          console.log('Student Identifier:', studentIdentifier);
          
          setIsAdvertising(true);
          setStatusMessage(`Sugárzás aktív\nService: ${SERVICE_UUID}\nAzonosító: ${studentIdentifier}`);
          
          Alert.alert(
            'Sugárzás elindítva',
            `A telefon most sugározza az adatokat:\n\n• Service UUID:\n${SERVICE_UUID}\n\n• Azonosító:\n${studentIdentifier}`,
            [{ text: 'OK' }]
          );
        })
        .catch((error: any) => {
          console.error('Failed to start advertising:', error);
          Alert.alert('Hiba', 'Nem sikerült elindítani a sugárzást: ' + error.message);
        });

    } catch (error: any) {
      console.error('Error starting advertising:', error);
      Alert.alert('Hiba', 'Nem sikerült elindítani a Bluetooth sugárzást: ' + error.message);
    }
  };

  const stopAdvertising = async () => {
    try {
      if (blePeripheralRef.current) {
        await blePeripheralRef.current.stop();
      }
      setIsAdvertising(false);
      setStatusMessage('Sugárzás leállítva');
      console.log('BLE advertising stopped');
    } catch (error) {
      console.error('Error stopping advertising:', error);
    }
  };

  const handleBluetoothToggle = async () => {
    if (isAdvertising) {
      await stopAdvertising();
    } else {
      // Ask user if they want to start advertising
      Alert.alert(
        'Bluetooth sugárzás',
        `Szeretné elindítani a Bluetooth sugárzást?\n\nSugárzandó adatok:\n• Service UUID: ${SERVICE_UUID}\n• Azonosító: ${studentIdentifier}`,
        [
          { text: 'Nem', style: 'cancel' },
          { text: 'Igen', onPress: startAdvertising },
        ]
      );
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.header}>
        <ThemedText type="title">Üdvözöljük!</ThemedText>
        <ThemedText style={styles.name}>{studentProfile?.name}</ThemedText>
        <ThemedText style={styles.indexNumber}>
          Indexszám: {studentProfile?.indexNumber}
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.content}>
        <TouchableOpacity 
          style={[
            styles.bluetoothButton,
            isAdvertising && styles.bluetoothButtonActive,
            bleAvailable === false && styles.bluetoothButtonWarning
          ]} 
          onPress={handleBluetoothToggle}
        >
          <Text style={styles.bluetoothButtonText}>
            {isAdvertising ? 'Sugárzás leállítása' : 'Bluetooth bekapcsolása'}
          </Text>
        </TouchableOpacity>
        
        {statusMessage ? (
          <ThemedText style={styles.statusText}>
            {isAdvertising ? '📡 ' : ''}{statusMessage}
          </ThemedText>
        ) : null}

        {studentIdentifier ? (
          <ThemedView style={styles.infoBox}>
            <ThemedText style={styles.infoLabel}>Sugárzandó azonosító:</ThemedText>
            <ThemedText style={styles.infoValue}>{studentIdentifier}</ThemedText>
          </ThemedView>
        ) : null}
      </ThemedView>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Kijelentkezés</Text>
      </TouchableOpacity>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 32,
  },
  name: {
    fontSize: 24,
    fontWeight: '600',
    marginTop: 8,
  },
  indexNumber: {
    fontSize: 16,
    opacity: 0.7,
    marginTop: 4,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  bluetoothButton: {
    backgroundColor: '#0a7ea4',
    height: 60,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bluetoothButtonActive: {
    backgroundColor: '#28a745',
  },
  bluetoothButtonWarning: {
    backgroundColor: '#fd7e14',
  },
  bluetoothButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  statusText: {
    fontSize: 14,
    opacity: 0.8,
    marginTop: 8,
    textAlign: 'center',
  },
  infoBox: {
    marginTop: 16,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 12,
    opacity: 0.6,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: '#dc3545',
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
