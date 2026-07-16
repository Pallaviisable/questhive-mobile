import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';

import * as api from '@/lib/api';
import { deleteToken, getToken, setToken } from '@/lib/token';

const USER_KEY = 'qh_user';

// Shape of the user object your backend returns on login/register.
// Loosely typed on purpose — tighten this once you confirm the exact
// response shape from Spring Boot (e.g. add role: 'FAMILY_ADMIN' | 'SUPER_ADMIN' | 'MEMBER').
type QuestHiveUser = {
    id: string;
    fullName: string;
    email: string;
    username?: string;
    usernameChanged?: boolean;
    coins?: number;
    avatarColor?: string;
    role?: string;
    inviteCode?: string;
    [key: string]: any;
};

type AuthContextType = {
    user: QuestHiveUser | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (data: {
        fullName: string;
        username: string;
        email: string;
        password: string;
        code: string;
    }) => Promise<{ email: string }>;
    verifyEmail: (email: string, otp: string) => Promise<void>;
    resendOtp: (email: string) => Promise<void>;
    logout: () => Promise<void>;
    updateUser: (patch: Partial<QuestHiveUser>) => Promise<void>;
    refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<QuestHiveUser | null>(null);
    // Starts true — we don't know yet whether a token exists on disk.
    // Root layout waits on this before deciding auth vs. tabs.
    const [isLoading, setIsLoading] = useState(true);

    // On app boot: check if we already have a valid session saved.
    useEffect(() => {
        (async () => {
            try {
                const token = await getToken();
                const storedUser = await AsyncStorage.getItem(USER_KEY);
                if (token && storedUser) {
                    setUser(JSON.parse(storedUser));
                }
            } catch (e) {
                // Corrupt storage — treat as logged out rather than crash.
                console.warn('Failed to restore session', e);
            } finally {
                setIsLoading(false);
            }
        })();
    }, []);

    // If the API layer sees a 401 anywhere, drop the session.
    useEffect(() => {
        api.setAuthFailureHandler(() => {
            setUser(null);
            AsyncStorage.removeItem(USER_KEY);
        });
    }, []);

    const persistSession = async (token: string, userData: QuestHiveUser) => {
        console.log("LOGIN USER DATA:", JSON.stringify(userData));
        await setToken(token);
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(userData));
        setUser(userData);
    };

    const login = async (email: string, password: string) => {
        const res = await api.login({ email, password });
        const { token, user: userData } = res.data;
        await persistSession(token, userData);
    };

    const register = async (data: {
        fullName: string;
        username: string;
        email: string;
        password: string;
        code: string;
    }) => {
        // Invite-only accounts are verified=true immediately on the backend —
        // no OTP step for this flow. User goes straight to login after this.
        await api.registerWithInvite(data);
        return { email: data.email };
    };

    const verifyEmail = async (email: string, otp: string) => {
        const res = await api.verifyEmail({ email, otp });
        // If your backend logs the user in immediately after verification
        // and returns a token, persist it. Otherwise this just confirms
        // verification and the user proceeds to the login screen.
        if (res.data?.token && res.data?.user) {
            await persistSession(res.data.token, res.data.user);
        }
    };

    const resendOtp = async (email: string) => {
        await api.resendOtp(email);
    };

    const logout = async () => {
        await deleteToken();
        await AsyncStorage.removeItem(USER_KEY);
        setUser(null);
    };

    const updateUser = async (patch: Partial<QuestHiveUser>) => {
        setUser((prev) => {
            if (!prev) return prev;
            const next = { ...prev, ...patch };
            AsyncStorage.setItem(USER_KEY, JSON.stringify(next));
            return next;
        });
    };
    const refreshUser = async () => {
        try {
            const res = await api.getMe();
            const freshUser = res.data.user;
            setUser(freshUser);
            await AsyncStorage.setItem(USER_KEY, JSON.stringify(freshUser));
        } catch (e) {
            console.warn('Failed to refresh user', e);
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                isLoading,
                isAuthenticated: !!user,
                login,
                register,
                verifyEmail,
                resendOtp,
                logout,
                updateUser,
                refreshUser,
            }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
    return ctx;
}
