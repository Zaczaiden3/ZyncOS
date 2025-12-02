import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut, 
  onAuthStateChanged, 
  User,
  updateProfile,
  AuthError
} from 'firebase/auth';
import { auth } from './firebaseConfig';

// Check if we are in mock mode based on the API key
const isMockMode = !import.meta.env.VITE_FIREBASE_API_KEY || import.meta.env.VITE_FIREBASE_API_KEY === "MOCK_KEY";

export interface AuthResponse {
  user?: User | { uid: string; email: string; displayName: string };
  error?: string;
}

export const loginUser = async (email: string, password: string): Promise<AuthResponse> => {
  if (isMockMode) {
    console.warn("Running in Auth Mock Mode");
    // Simulate network delay
    await new Promise(r => setTimeout(r, 1000));
    
    if (email === 'test_user@zync.ai' && password === 'dev_mode_active') {
        return { 
            user: { 
                uid: 'mock-user-123', 
                email, 
                displayName: 'Test Operator' 
            } 
        };
    }
    return { error: "Invalid credentials (Mock Mode)" };
  }

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { user: userCredential.user };
  } catch (error: any) {
    return { error: error.message };
  }
};

export const registerUser = async (email: string, password: string, displayName: string): Promise<AuthResponse> => {
    if (isMockMode) {
        await new Promise(r => setTimeout(r, 1500));
        return { 
            user: { 
                uid: `mock-${Date.now()}`, 
                email, 
                displayName 
            } 
        };
    }

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        if (displayName && userCredential.user) {
            await updateProfile(userCredential.user, { displayName });
        }
        return { user: userCredential.user };
    } catch (error: any) {
        return { error: error.message };
    }
};

export const logoutUser = async () => {
    if (isMockMode) return;
    try {
        await firebaseSignOut(auth);
    } catch (error) {
        console.error("Logout failed", error);
    }
};

export const subscribeToAuthChanges = (callback: (user: User | null) => void) => {
    if (isMockMode) {
        // In mock mode, we don't have a real listener.
        // The app will handle state via the login response.
        return () => {};
    }
    return onAuthStateChanged(auth, callback);
};

export const getCurrentUser = () => {
    if (isMockMode) return null;
    return auth.currentUser;
};
