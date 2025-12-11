import { Stack } from 'expo-router';

export default function StudentLayout() {
  return (
    <Stack>
      <Stack.Screen 
        name="index" 
        options={{ 
          title: 'Diák kezdőlap',
          headerShown: true,
        }} 
      />
    </Stack>
  );
}
