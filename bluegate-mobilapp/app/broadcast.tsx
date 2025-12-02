import { Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

export default function Broadcast() {
  return (
    <SafeAreaView className="flex-1 bg-background-dark">
      {/* Header */}
      <View className="flex-row items-center px-4 pb-2 justify-between">
        <View className="w-12 h-12" />
        <Text className="text-lg font-bold text-text-light flex-1 text-center">
          Irányítópult
        </Text>
        <TouchableOpacity
          className="w-12 h-12 items-center justify-center"
          onPress={() => router.push("/")}
        >
          <Text className="text-text-light/60 text-3xl">⊗</Text>
        </TouchableOpacity>
      </View>

      {/* Content - Centered */}
      <View className="flex-1 justify-center items-center px-4 -mt-16">
        {/* Index Number Section */}
        <View className="w-full max-w-sm items-center">
          <Text className="text-primary/70 text-sm font-normal pb-1 pt-1">
            Index Szám
          </Text>
          <View className="flex-row items-center justify-center gap-3">
            <Text className="text-text-light text-4xl font-bold">
              DUMMY INDEX
            </Text>
            <TouchableOpacity>
              <Text className="text-2xl">{/* Copy jel helye */}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Spacer */}
        <View className="h-16" />

        {/* Bluetooth ID Section */}
        <View className="w-full max-w-sm items-center">
          <Text className="text-primary/70 text-sm font-normal pb-1 pt-1">
            Bluetooth ID
          </Text>
          <View className="flex-row items-center justify-center gap-3">
            <Text className="text-text-light text-4xl font-bold">
              DUMMY-MAC-CIM
            </Text>
            <TouchableOpacity>
              <Text className="text-2xl">{/* Copy jel helye */}</Text>
            </TouchableOpacity>
          </View>

          {/* Connect Button */}
          <View className="mt-8">
            <TouchableOpacity className="flex-row items-center justify-center gap-2 rounded-full bg-primary/20 px-6 py-3">
              <Text className="text-xl">{/* Bluethoot jel helye */}</Text>
              <Text className="text-lg font-bold text-primary">
                Csatlakozás
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
