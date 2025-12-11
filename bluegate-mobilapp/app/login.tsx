import { useState } from 'react';
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Text,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/hooks/use-auth';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function LoginScreen() {
  const [indexNumber, setIndexNumber] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { signIn } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const handleLogin = async () => {
    if (!indexNumber.trim() || !password.trim()) {
      Alert.alert('Hiba', 'Kérjük, töltse ki az összes mezőt.');
      return;
    }

    setIsLoading(true);

    try {
      const result = await signIn({ indexNumber, password });

      if (!result.ok) {
        Alert.alert('Bejelentkezési hiba', result.message || 'Sikertelen bejelentkezés.');
      }
      // Navigation is handled by _layout.tsx based on auth status
    } catch (error) {
      Alert.alert('Hiba', 'Váratlan hiba történt. Kérjük, próbálja újra.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ThemedView style={styles.innerContainer}>
        <ThemedView style={styles.header}>
          <ThemedText type="title" style={styles.title}>
            BlueGate
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            Diák bejelentkezés
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.form}>
          <ThemedView style={styles.inputContainer}>
            <ThemedText style={styles.label}>Indexszám</ThemedText>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colorScheme === 'dark' ? '#2a2a2a' : '#f5f5f5',
                  color: colors.text,
                  borderColor: colorScheme === 'dark' ? '#444' : '#ddd',
                },
              ]}
              placeholder="12345678"
              placeholderTextColor={colorScheme === 'dark' ? '#888' : '#999'}
              value={indexNumber}
              onChangeText={setIndexNumber}
              keyboardType="number-pad"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />
          </ThemedView>

          <ThemedView style={styles.inputContainer}>
            <ThemedText style={styles.label}>Jelszó</ThemedText>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colorScheme === 'dark' ? '#2a2a2a' : '#f5f5f5',
                  color: colors.text,
                  borderColor: colorScheme === 'dark' ? '#444' : '#ddd',
                },
              ]}
              placeholder="••••••••"
              placeholderTextColor={colorScheme === 'dark' ? '#888' : '#999'}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!isLoading}
            />
          </ThemedView>

          <TouchableOpacity
            style={[
              styles.button,
              isLoading && styles.buttonDisabled,
            ]}
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Bejelentkezés</Text>
            )}
          </TouchableOpacity>
        </ThemedView>

        <ThemedView style={styles.footer}>
          <ThemedText style={styles.footerText}>
            Probléma a bejelentkezéssel?
          </ThemedText>
          <ThemedText style={[styles.footerLink, { color: colors.tint }]}>
            Forduljon az adminisztrátorhoz
          </ThemedText>
        </ThemedView>
      </ThemedView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  innerContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    opacity: 0.7,
  },
  form: {
    gap: 20,
  },
  inputContainer: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  button: {
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    backgroundColor: '#0a7ea4',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    marginTop: 32,
    gap: 4,
  },
  footerText: {
    fontSize: 14,
    opacity: 0.6,
  },
  footerLink: {
    fontSize: 14,
    fontWeight: '500',
  },
});
