import { SafeAreaProvider } from "react-native-safe-area-context";
import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { router } from "expo-router";

export default function Login() {
  return (
    <SafeAreaProvider>
      <View className="flex-1 bg-background-dark items-center justify-center px-6">
        <View className="w-full max-w-sm">
          {/* Header */}
          <Text className="text-white text-[32px] font-bold text-center pb-2 pt-6">
            BlueGate
          </Text>
          <Text className="text-text-light text-base text-center pb-10 pt-1">
            Jelentkezz be a folytatáshoz.
          </Text>

          {/* Index Input */}
          <View className="mb-4">
            <Text className="text-text-light text-base font-medium mb-2">
              Index
            </Text>
            <View className="relative">
              <TextInput
                placeholder="Írd be az index számod"
                placeholderTextColor="rgba(241, 228, 228, 0.4)"
                className="w-full h-14 bg-white/5 border border-white/20 rounded-lg text-text-light px-12 text-base"
              />
              {/* Icon would go here with react-native-vector-icons or @expo/vector-icons */}
            </View>
          </View>

          {/* Password Input */}
          <View className="mb-4">
            <Text className="text-text-light text-base font-medium mb-2">
              Jelszó
            </Text>
            <View className="relative">
              <TextInput
                placeholder="Írd be a jelszavad"
                placeholderTextColor="rgba(241, 228, 228, 0.4)"
                secureTextEntry
                className="w-full h-14 bg-white/5 border border-white/20 rounded-lg text-text-light px-12 text-base"
              />
            </View>
          </View>

          {/* Login Button */}
          { /* Nincs kitoltes check meg, de csak akkor fog tovabb menni a gomb ha az adatok helyesek */}
          <TouchableOpacity className="w-full my-4 h-14 bg-primary rounded-lg items-center justify-center active:scale-95"
          onPress={() => router.push("/broadcast")}>
            <Text className="text-background-dark text-base font-bold">
              Bejelentkezés
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="w-full max-w-sm h-14 bg-primary rounded-lg items-center justify-center active:scale-95"
            onPress={() => router.back()}
          >
            <Text className="text-background-dark text-base font-bold">
              Vissza
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaProvider>
  );
}
