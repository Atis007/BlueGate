import { Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";

export default function Index() {
  return (
    <View className="flex-1 bg-background-dark items-center justify-center px-6">
      <Text className="text-white text-[32px] font-bold text-center mb-2">
        BlueGate
      </Text>
      <Text className="text-text-light text-base text-center mb-8">
        Automatikus jelenléti rendszer
      </Text>

      <TouchableOpacity
        className="w-full max-w-sm h-14 bg-primary rounded-lg items-center justify-center active:scale-95"
        onPress={() => router.push("/login")}
      >
        <Text className="text-background-dark text-base font-bold">
          Bejelentkezés
        </Text>
      </TouchableOpacity>
    </View>
  );
}
