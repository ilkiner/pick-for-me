import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import HomeScreen from '../screens/main/HomeScreen';
import ResultScreen from '../screens/main/ResultScreen';
import SettingsScreen from '../screens/main/SettingsScreen';
import WheelOfFortuneScreen from '../screens/tools/WheelOfFortuneScreen';
import DiceScreen from '../screens/tools/DiceScreen';
import CoinFlipScreen from '../screens/tools/CoinFlipScreen';
import ColorPickerScreen from '../screens/tools/ColorPickerScreen';
import IdeaGeneratorScreen from '../screens/tools/IdeaGeneratorScreen';
import QuickChallengeScreen from '../screens/tools/QuickChallengeScreen';
import MoviePickerScreen from '../screens/tools/MoviePickerScreen';
import { Theme } from '../core/Theme';
import { Ionicons } from '@expo/vector-icons';
import { View, Platform } from 'react-native';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabNavigator() {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName: any;
                    if (route.name === 'Home') {
                        iconName = focused ? 'home' : 'home-outline';
                    } else if (route.name === 'ResultTab') {
                        iconName = focused ? 'stats-chart' : 'stats-chart-outline';
                    } else if (route.name === 'Settings') {
                        iconName = focused ? 'settings' : 'settings-outline';
                    }

                    return (
                        <View style={{
                            backgroundColor: focused ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                            padding: 8,
                            borderRadius: 12,
                        }}>
                            <Ionicons name={iconName} size={size} color={color} />
                        </View>
                    );
                },
                tabBarActiveTintColor: Theme.colors.primary,
                tabBarInactiveTintColor: Theme.colors.textSecondary,
                tabBarStyle: {
                    backgroundColor: Theme.colors.background,
                    borderTopWidth: 1,
                    borderTopColor: Theme.colors.surfaceBorder,
                    height: Platform.OS === 'ios' ? 88 : 68,
                    paddingBottom: Platform.OS === 'ios' ? 30 : 12,
                    paddingTop: 12,
                    elevation: 0,
                    shadowOpacity: 0,
                },
                tabBarShowLabel: false,
            })}
        >
            <Tab.Screen name="Home" component={HomeScreen} />
            <Tab.Screen
                name="ResultTab"
                component={ResultScreen}
                initialParams={{ result: null, type: 'none' }}
                options={{ tabBarLabel: 'Result' }}
            />
            <Tab.Screen name="Settings" component={SettingsScreen} />
        </Tab.Navigator>
    );
}

export function RootNavigator({ session }: { session: any }) {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            {session && session.user ? (
                // App Stack
                <>
                    <Stack.Screen name="Main" component={MainTabNavigator} />
                    <Stack.Screen name="Result" component={ResultScreen} />
                    <Stack.Screen name="WheelOfFortune" component={WheelOfFortuneScreen} />
                    <Stack.Screen name="Dice" component={DiceScreen} />
                    <Stack.Screen name="CoinFlip" component={CoinFlipScreen} />
                    <Stack.Screen name="ColorPicker" component={ColorPickerScreen} />
                    <Stack.Screen name="IdeaGenerator" component={IdeaGeneratorScreen} />
                    <Stack.Screen name="QuickChallenge" component={QuickChallengeScreen} />
                    <Stack.Screen name="MoviePicker" component={MoviePickerScreen} />
                </>
            ) : (
                // Auth Stack
                <>
                    <Stack.Screen name="Login" component={LoginScreen} />
                    <Stack.Screen name="Register" component={RegisterScreen} />
                </>
            )}
        </Stack.Navigator>
    );
}
