import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';

export default function AddStudentScreen() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    class: '',
    studentId: '',
    email: '',
    phone: '',
    address: '',
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.name.trim()) {
      newErrors.name = 'A név megadása kötelező';
    }

    if (!formData.class.trim()) {
      newErrors.class = 'Az osztály megadása kötelező';
    }

    if (!formData.studentId.trim()) {
      newErrors.studentId = 'A diák ID megadása kötelező';
    }

    if (formData.email && !formData.email.includes('@')) {
      newErrors.email = 'Érvénytelen email cím';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      // Itt történne az adatbázisba mentés
      Alert.alert(
        'Siker',
        'A diák sikeresen hozzáadva!',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } else {
      Alert.alert('Hiba', 'Kérlek töltsd ki a kötelező mezőket!');
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
    // Töröljük a hibát a mező módosításakor
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.formContainer}>
            {/* Név */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Név <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, errors.name && styles.inputError]}
                placeholder="Teljes név"
                value={formData.name}
                onChangeText={(value) => updateField('name', value)}
              />
              {errors.name ? (
                <Text style={styles.errorText}>{errors.name}</Text>
              ) : null}
            </View>

            {/* Osztály */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Osztály <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, errors.class && styles.inputError]}
                placeholder="pl. 9.A"
                value={formData.class}
                onChangeText={(value) => updateField('class', value)}
              />
              {errors.class ? (
                <Text style={styles.errorText}>{errors.class}</Text>
              ) : null}
            </View>

            {/* Diák ID */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Diák ID <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, errors.studentId && styles.inputError]}
                placeholder="pl. STU001"
                value={formData.studentId}
                onChangeText={(value) => updateField('studentId', value)}
                autoCapitalize="characters"
              />
              {errors.studentId ? (
                <Text style={styles.errorText}>{errors.studentId}</Text>
              ) : null}
            </View>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={[styles.input, errors.email && styles.inputError]}
                placeholder="pelda@email.com"
                value={formData.email}
                onChangeText={(value) => updateField('email', value)}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {errors.email ? (
                <Text style={styles.errorText}>{errors.email}</Text>
              ) : null}
            </View>

            {/* Telefon */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Telefonszám</Text>
              <TextInput
                style={styles.input}
                placeholder="+36 30 123 4567"
                value={formData.phone}
                onChangeText={(value) => updateField('phone', value)}
                keyboardType="phone-pad"
              />
            </View>

            {/* Cím */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Cím</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Lakcím"
                value={formData.address}
                onChangeText={(value) => updateField('address', value)}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Gombok */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={styles.submitButton}
                onPress={handleSubmit}
              >
                <Text style={styles.submitButtonText}>Hozzáadás</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => router.back()}
              >
                <Text style={styles.cancelButtonText}>Mégse</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  formContainer: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  required: {
    color: '#FF3B30',
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  inputError: {
    borderColor: '#FF3B30',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    marginTop: 4,
  },
  buttonContainer: {
    marginTop: 24,
    gap: 12,
  },
  submitButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
});
