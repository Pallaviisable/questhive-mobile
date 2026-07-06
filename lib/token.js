import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'qh_token';

export async function getToken() {
    return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(token) {
    return SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function deleteToken() {
    return SecureStore.deleteItemAsync(TOKEN_KEY);
}
