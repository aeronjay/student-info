import { Stack } from "expo-router";
import { UserProvider } from './components/UserContext';
import "./globals.css"

export default function RootLayout() {
  return (
    <UserProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </UserProvider>
  );
}
