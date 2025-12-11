import { Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import * as ClipBoard from "expo-clipboard";

const STUDENT_NAME = "Tanuló Neve";
const STUDENT_ID = "DUMMY INDEX";
const BLUETOOTH_ID = "DUMMY-BT-ID-1234";

export default function Broadcast() {
  function handleCopy(TextToCopy: string) {
    ClipBoard.setStringAsync(TextToCopy);
    alert("Másolva a vágólapra!");
  }

  return (
    <SafeAreaView className="flex-1 bg-background-dark">
      {/* Header */}
      <View className="flex-row items-center px-5 pt-4 pb-3 justify-between">
        <View className="w-10 h-10" />
        <Text className="text-lg font-bold text-text-dark flex-1 text-center">
          Irányítópult
        </Text>
        <TouchableOpacity className="w-10 h-10 items-center justify-center">
          <Feather name="log-out" size={26} color="#11dee8" />
        </TouchableOpacity>
      </View>

      {/* Greeting */}
      <View className="px-6 mt-2">
        <Text className="text-lg text-text-dark/70">Üdv,</Text>
        <Text className="text-4xl font-bold text-text-dark">
          {STUDENT_NAME}!
        </Text>
      </View>

      {/* Content */}
      <View className="flex-1 justify-center items-center px-4">
        {/* Index Number Section */}
        <View className="w-full max-w-sm items-center">
          <Text className="text-primary/70 text-sm font-normal leading-normal pb-1 pt-1">
            Index Szám
          </Text>
          <View className="flex-row items-center justify-center gap-3">
            <Text className="text-text-dark tracking-light text-4xl font-bold leading-tight">
              {STUDENT_ID}
            </Text>
            <TouchableOpacity
              className="p-2"
              onPress={() => handleCopy(STUDENT_ID)}
            >
              <Feather
                name="copy"
                size={24}
                color="#11dee8"
                className="material-symbols-outlined"
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Spacer */}
        <View className="h-10" />

        {/* Bluetooth ID Section */}
        <View className="w-full max-w-sm items-center">
          <Text className="text-primary/70 text-sm font-normal leading-normal pb-1 pt-1">
            Bluetooth ID
          </Text>
          <View className="flex-row items-center justify-center gap-3">
            <Text className="text-text-dark tracking-light text-4xl font-bold leading-tight">
              {BLUETOOTH_ID}
            </Text>
            <TouchableOpacity
              className="p-2"
              onPress={() => handleCopy(BLUETOOTH_ID)}
            >
              <Feather
                name="copy"
                size={24}
                color="#11dee8"
                className="material-symbols-outlined text-2xl"
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Connect Button */}
        <View className="mt-8 flex justify-center">
          <TouchableOpacity
            activeOpacity={0.4}
            className="bg-[#003134] text-[#11dee8] font-bold py-4 px-10 rounded-full flex-row text-lg flex items-center justify-center"
          >
            <Feather name="bluetooth" size={14} color="#11dee8" />
            <Text className="ml-3 text-xl text-primary">Csatlakozás</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Bottom Tab Placeholder */}
      <View className="sticky bottom-0 bg-background-dark/80 backdrop-blur-lg border-t border-white/10 mx-auto w-full max-w-lg">
        <View className="flex justify-around items-center h-20">
          <TouchableOpacity
            className="flex flex-col items-center gap-1"
            onPress={() => router.push("/")}
          >
            <Feather
              name="home"
              size={20}
              color="#11dee8"
              className="material-symbols-outlined text-2xl"
            />
            <Text className="text-primary text-xs font-medium">Kezdőlap</Text>
          </TouchableOpacity>
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
      </View>
    </SafeAreaView>
  );
}
