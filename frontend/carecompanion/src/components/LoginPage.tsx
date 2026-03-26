import React, { useState } from 'react';
import { Heart, Eye, EyeOff } from 'lucide-react';

interface LoginPageProps {
  onLogin: () => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  // This runs when you click the Login button
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // Stops the page from refreshing

    try {
      // Send the email and password to Flask
      const endpoint = isRegistering ? '/api/register' : '/api/login';
      const response = await fetch(`${import.meta.env.VITE_API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, password: password }),
      });

      if (response.ok) {
        if (isRegistering) {
          alert("🎉 Registration successful! You can now log in.");
          setIsRegistering(false); // Turn the switch back to login mode
          setPassword(''); // Clear the password box
        } else {
          onLogin(); // Let them in!
        }
      } else {
        const errorData = await response.json();
        alert(`❌ ${errorData.error || 'Wrong email or password.'}`);
      }
    } catch (error) {
      alert("🔌 Cannot connect to the server. Make sure your Flask backend is running.");
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