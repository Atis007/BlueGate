import { Stack } from 'expo-router';

export default function AdminLayout() {
  return (
    <Stack>
      <Stack.Screen 
        name="students" 
        options={{ 
          title: 'Diákok',
          headerShown: true 
        }} 
      />
      <Stack.Screen 
        name="add-student" 
        options={{ 
          title: 'Diák hozzáadása',
          headerShown: true 
        }} 
      />
    </Stack>
  );
}
