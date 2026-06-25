import React, { useState } from 'react';
import { Heart, Eye, EyeOff, UserCircle2  } from 'lucide-react';
// @ts-ignore
import { supabase } from './supabase';

interface LoginPageProps {
  onLogin: () => void;
  onGuestLogin: () => void;
}

export default function LoginPage({ onLogin, onGuestLogin }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  // This runs when you click the Login button

// 1. Import Supabase instead of Firebase
// ... keep your other imports like Heart, Eye, etc.

// ... inside your component:
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); 

    try {
      if (isRegistering) {
        // Tell Supabase to make a new user
        const { error } = await supabase.auth.signUp({
          email: email,
          password: password,
        });
        
        if (error) throw error;
        
        alert("🎉 Registration successful! You can now log in.");
        setIsRegistering(false); 
        setPassword(''); 
      } else {
        // Tell Supabase to log the user in
        const { error } = await supabase.auth.signInWithPassword({
          email: email,
          password: password,
        });
        
        if (error) throw error;
        onLogin(); // Let them in!
      }
    } catch (error: any) {
      alert(`❌ ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Heart className="size-10 text-blue-600" fill="currentColor" />
            <span className="text-blue-900 text-2xl">CareCompanion</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">
            {isRegistering ? 'Create an Account' : 'Welcome Back!'}
          </h1>
          <p className="text-gray-600 mt-2">Sign in to manage your health</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
              </button>
            </div>
            <div className="text-right mt-2">
              <a href="#" className="text-blue-600 hover:text-blue-700 transition-colors">
                Forgot Password?
              </a>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-all shadow-md hover:shadow-lg"
          >
            {isRegistering ? 'Sign Up' : 'Login'}
          </button>
          

          {/* Divider */}
          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <span className="relative bg-white px-4 text-sm text-gray-500">OR</span>
          </div>

          {/* Guest Login Button */}
          <button
            type="button"
            onClick={onGuestLogin}
            className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 text-gray-600 py-3 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all"
          >
            <UserCircle2 className="size-5" />
            <span>Continue as Guest</span>
          </button>

          {/* Guest Mode Info */}
          <p className="text-center text-xs text-gray-500 -mt-2">
            Limited access mode – your data won't be saved permanently
          </p>
          
          <p className="text-center text-gray-600">
            {isRegistering ? 'Already have an account? ' : 'New User? '}
            <button
              type="button"
              onClick={() => setIsRegistering(!isRegistering)}
              className="text-blue-600 hover:text-blue-700 transition-colors font-medium"
            >
              {isRegistering ? 'Login Here' : 'Register Here'}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}