import { useState, useEffect, useRef } from 'react';
import { StyleSheet, TouchableOpacity, Text, Alert, Platform, PermissionsAndroid, Modal, View, Animated } from 'react-native';
import * as IntentLauncher from 'expo-intent-launcher';
import BleAdvertiser from '@/modules/ble-advertiser';
import { supabase } from '@/lib/supabase';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/hooks/use-auth';

const SERVICE_UUID = process.env.EXPO_PUBLIC_APP_SERVICE_UUID || '';

export default function StudentIndex() {
  const { studentProfile, signOut } = useAuth();
  const [isAdvertising, setIsAdvertising] = useState(false);
  const [bleAvailable, setBleAvailable] = useState<boolean | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [resultModalMessage, setResultModalMessage] = useState('');
  const [resultModalTitle, setResultModalTitle] = useState('');
  const [resultModalVariant, setResultModalVariant] = useState<'success' | 'error'>('success');
  const hasAttendanceConfirmationRef = useRef(false);
  const advertisingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const modalPulse = useRef(new Animated.Value(0)).current;

  // Generate the student identifier to broadcast
  // Teljes indexszám - a device name-ben küldjük
  const studentIdentifier = studentProfile?.indexNumber || '';

  useEffect(() => {
    // Check if BLE Advertiser module is available
    if (BleAdvertiser) {
      setBleAvailable(true);
      setStatusMessage('Bluetooth elérhető');
    } else {
      setBleAvailable(false);
      setStatusMessage('BLE Advertiser nem elérhető');
    }

    return () => {
      if (advertisingTimeoutRef.current) {
        clearTimeout(advertisingTimeoutRef.current);
        advertisingTimeoutRef.current = null;
      }
      // Stop advertising on unmount
      if (isAdvertising && BleAdvertiser) {
        BleAdvertiser.stopAdvertising().catch((error: any) => {
          console.error('Error stopping advertising on unmount:', error);
        });
      }
    };
  }, []);

  useEffect(() => {
    if (!resultModalVisible) {
      modalPulse.setValue(0);
      return;
    }

    Animated.sequence([
      Animated.timing(modalPulse, {
        toValue: 1,
        duration: 240,
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(modalPulse, {
            toValue: 0.9,
            duration: 900,
            useNativeDriver: true,
          }),
          Animated.timing(modalPulse, {
            toValue: 1,
            duration: 900,
            useNativeDriver: true,
          }),
        ])
      ),
    ]).start();
  }, [resultModalVisible, modalPulse]);

  // Listen for attendance updates
  useEffect(() => {
    if (!studentProfile?.id || !supabase) return;

    // Feliratkozás az attendance tábla változásaira
    // Csak a beszúrásokat figyeljük, ahol a diak_id megegyezik a miénkkel
    const channel = supabase
      .channel('attendance-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'attendance',
          filter: `diak_id=eq.${studentProfile.id}`,
        },
        (payload) => {
          console.log('Jelenlét rögzítve:', payload);
          hasAttendanceConfirmationRef.current = true;
          if (advertisingTimeoutRef.current) {
            clearTimeout(advertisingTimeoutRef.current);
            advertisingTimeoutRef.current = null;
          }
          stopAdvertising().catch((error) => {
            console.error('Error stopping advertising after success:', error);
          });
          setResultModalTitle('Sikeres jelentkezés');
          setResultModalMessage('A rendszer rögzítette a jelenlétedet.');
          setResultModalVariant('success');
          setResultModalVisible(true);
        }
      )
      .subscribe((status, err) => {
        console.log(`[Realtime] Subscription status: ${status}`, err ? err : '');
        if (status === 'SUBSCRIBED') {
           console.log(`[Realtime] Listening for INSERT on public.attendance where diak_id=${studentProfile.id}`);
        }
      });

    return () => {
      supabase?.removeChannel(channel);
    };
  }, [studentProfile?.id]);

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
    if (!bleAvailable || !BleAdvertiser) {
      // Fallback: show info
      Alert.alert(
        'Bluetooth nem elérhető',
        `BLE Advertiser nem elérhető.\n\nSugárzandó adatok:\n- Service UUID: ${SERVICE_UUID}\n- Azonosító: ${studentIdentifier}`,
        [
          { text: 'OK', style: 'cancel' },
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

      if (advertisingTimeoutRef.current) {
        clearTimeout(advertisingTimeoutRef.current);
        advertisingTimeoutRef.current = null;
      }

      hasAttendanceConfirmationRef.current = false;

      // Start advertising using native module
      const result = await BleAdvertiser.startAdvertising(SERVICE_UUID, studentIdentifier);
      
      console.log('BLE Advertising started:', result);
      console.log('Service UUID:', SERVICE_UUID);
      console.log('Student Identifier:', studentIdentifier);
      
      setIsAdvertising(true);
      setStatusMessage(`Sugárzás aktív\nService: ${SERVICE_UUID}\nAzonosító: ${studentIdentifier}`);

      advertisingTimeoutRef.current = setTimeout(() => {
        if (!hasAttendanceConfirmationRef.current) {
          stopAdvertising().catch((error) => {
            console.error('Error stopping advertising after timeout:', error);
          });
          setResultModalTitle('Nem érkezett visszaigazolás');
          setResultModalMessage('Kérdezd meg a tanárt, hogy sikerült-e, valami hiba történt.');
          setResultModalVariant('error');
          setResultModalVisible(true);
        } else {
          stopAdvertising().catch((error) => {
            console.error('Error stopping advertising after timeout:', error);
          });
        }
      }, 15 * 1000);
      
      Alert.alert(
        'Sugárzás elindítva',
        `A telefon most sugározza az adatokat:\n\n• Service UUID:\n${SERVICE_UUID}\n\n• Azonosító:\n${studentIdentifier}`,
        [{ text: 'OK' }]
      );

    } catch (error: any) {
      console.error('Error starting advertising:', error);
      Alert.alert('Hiba', 'Nem sikerült elindítani a Bluetooth sugárzást: ' + error.message);
    }
  };

  const stopAdvertising = async () => {
    try {
      if (advertisingTimeoutRef.current) {
        clearTimeout(advertisingTimeoutRef.current);
        advertisingTimeoutRef.current = null;
      }
      if (BleAdvertiser) {
        await BleAdvertiser.stopAdvertising();
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
      <Modal
        transparent
        visible={resultModalVisible}
        animationType="none"
        onRequestClose={() => setResultModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <Animated.View
            style={[
              styles.modalGlow,
              resultModalVariant === 'success'
                ? styles.modalGlowSuccess
                : styles.modalGlowError,
              {
                opacity: modalPulse.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.35, 0.9],
                }),
                transform: [
                  {
                    scale: modalPulse.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.9, 1.05],
                    }),
                  },
                ],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.modalCard,
              resultModalVariant === 'success'
                ? styles.modalCardSuccess
                : styles.modalCardError,
              {
                opacity: modalPulse.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 1],
                }),
                transform: [
                  {
                    translateY: modalPulse.interpolate({
                      inputRange: [0, 1],
                      outputRange: [30, 0],
                    }),
                  },
                  {
                    scale: modalPulse.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.95, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <View
                style={[
                  styles.modalAccent,
                  resultModalVariant === 'success'
                    ? styles.modalAccentSuccess
                    : styles.modalAccentError,
                ]}
              />
              <ThemedText style={styles.modalTitle}>{resultModalTitle}</ThemedText>
            </View>
            <ThemedText style={styles.modalMessage}>{resultModalMessage}</ThemedText>
            <TouchableOpacity
              style={[
                styles.modalButton,
                resultModalVariant === 'success'
                  ? styles.modalButtonSuccess
                  : styles.modalButtonError,
              ]}
              onPress={() => setResultModalVisible(false)}
            >
              <Text style={styles.modalButtonText}>Rendben</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 7, 12, 0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalGlow: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    shadowOpacity: 0.9,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 0 },
  },
  modalGlowSuccess: {
    backgroundColor: '#22c55e',
    shadowColor: '#22c55e',
  },
  modalGlowError: {
    backgroundColor: '#ef4444',
    shadowColor: '#ef4444',
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 24,
    paddingVertical: 22,
    paddingHorizontal: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.65,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 16 },
    elevation: 16,
  },
  modalCardSuccess: {
    backgroundColor: '#081417',
    borderColor: '#1b4b3a',
  },
  modalCardError: {
    backgroundColor: '#0b0f17',
    borderColor: '#1f2a44',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  modalAccent: {
    width: 10,
    height: 52,
    borderRadius: 6,
  },
  modalAccentSuccess: {
    backgroundColor: '#22c55e',
  },
  modalAccentError: {
    backgroundColor: '#ef4444',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f8fafc',
  },
  modalMessage: {
    fontSize: 15,
    color: '#cbd5f5',
    lineHeight: 21,
    marginBottom: 20,
  },
  modalButton: {
    borderRadius: 12,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonSuccess: {
    backgroundColor: '#16a34a',
  },
  modalButtonError: {
    backgroundColor: '#ef4444',
  },
  modalButtonText: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
