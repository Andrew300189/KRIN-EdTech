"use client";

import Link from "next/link";
import { useState } from "react";

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);

  const features = [
    {
      icon: "🎓",
      title: "Interactive Lessons",
      description:
        "Learn through engaging lessons in reading, writing, listening, and speaking",
    },
    {
      icon: "🤖",
      title: "AI Tutor",
      description: "Get personalized help from our advanced AI tutoring system",
    },
    {
      icon: "📚",
      title: "Vocabulary Builder",
      description:
        "Master 1000+ words with interactive flashcards and spaced repetition",
    },
    {
      icon: "🏆",
      title: "Achievements",
      description:
        "Earn badges and track your progress with our gamification system",
    },
    {
      icon: "📊",
      title: "Analytics",
      description:
        "Monitor your learning progress with detailed analytics and insights",
    },
    {
      icon: "💳",
      title: "Flexible Plans",
      description:
        "Choose from free, premium, or pro plans suited to your needs",
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="text-2xl font-bold text-primary">KRIN EdTech</div>

          <button className="md:hidden" onClick={() => setMenuOpen(!menuOpen)}>
            ☰
          </button>

          <div
            className={`${menuOpen ? "block" : "hidden"} md:flex gap-8 md:gap-6 md:items-center absolute md:static top-full left-0 right-0 bg-white md:bg-transparent p-4 md:p-0 shadow-md md:shadow-none`}
          >
            <a href="#features" className="text-gray-600 hover:text-primary">
              Features
            </a>
            <a href="#pricing" className="text-gray-600 hover:text-primary">
              Pricing
            </a>
            <a href="#contact" className="text-gray-600 hover:text-primary">
              Contact
            </a>
            <Link
              href="/auth/login"
              className="btn btn-secondary hidden md:inline-block"
            >
              Sign In
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary/10 via-secondary/5 to-transparent py-20 md:py-32">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 text-gray-900">
            Master English with{" "}
            <span className="text-primary">AI-Powered Learning</span>
          </h1>

          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Learn at your own pace with interactive lessons, personalized AI
            tutoring, and a community of learners worldwide.
          </p>

          <div className="flex flex-col md:flex-row gap-4 justify-center mb-12">
            <Link
              href="/auth/register"
              className="btn btn-primary text-lg px-8 py-3"
            >
              Start Learning Free
            </Link>
            <Link
              href="/auth/login"
              className="btn btn-secondary text-lg px-8 py-3"
            >
              Sign In
            </Link>
          </div>

          <p className="text-gray-500">
            ✓ No credit card required • ✓ Free forever plan • ✓ Start in seconds
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-16">
            Why Choose KRIN?
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <div
                key={i}
                className="bg-white p-8 rounded-lg shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="text-5xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold mb-3 text-gray-900">
                  {feature.title}
                </h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-primary">50K+</div>
              <p className="text-gray-600 mt-2">Active Students</p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary">100+</div>
              <p className="text-gray-600 mt-2">Courses</p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary">24/7</div>
              <p className="text-gray-600 mt-2">AI Support</p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary">95%</div>
              <p className="text-gray-600 mt-2">Success Rate</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-16">
            Simple, Transparent Pricing
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {/* Free Plan */}
            <div className="bg-white rounded-lg shadow-sm p-8">
              <h3 className="text-2xl font-bold mb-2">Free</h3>
              <p className="text-gray-600 mb-6">For getting started</p>
              <div className="text-4xl font-bold mb-6">
                $0<span className="text-lg text-gray-600">/mo</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span>Basic lessons</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span>Community access</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span>Progress tracking</span>
                </li>
              </ul>
              <button className="btn btn-secondary w-full">Get Started</button>
            </div>

            {/* Premium Plan */}
            <div className="bg-primary text-white rounded-lg shadow-md p-8 md:scale-105">
              <div className="bg-white text-primary px-3 py-1 rounded-full inline-block text-sm font-semibold mb-4">
                POPULAR
              </div>
              <h3 className="text-2xl font-bold mb-2">Premium</h3>
              <p className="mb-6 opacity-90">Most popular</p>
              <div className="text-4xl font-bold mb-6">
                $29<span className="text-lg opacity-90">/mo</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2">
                  <span>✓</span>
                  <span>Unlimited lessons</span>
                </li>
                <li className="flex items-center gap-2">
                  <span>✓</span>
                  <span>AI tutor access</span>
                </li>
                <li className="flex items-center gap-2">
                  <span>✓</span>
                  <span>Certificates</span>
                </li>
                <li className="flex items-center gap-2">
                  <span>✓</span>
                  <span>Priority support</span>
                </li>
              </ul>
              <Link
                href="/auth/register"
                className="btn bg-white text-primary hover:bg-gray-100 w-full"
              >
                Try Premium
              </Link>
            </div>

            {/* Pro Plan */}
            <div className="bg-white rounded-lg shadow-sm p-8">
              <h3 className="text-2xl font-bold mb-2">Pro</h3>
              <p className="text-gray-600 mb-6">For serious learners</p>
              <div className="text-4xl font-bold mb-6">
                $79<span className="text-lg text-gray-600">/mo</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span>Everything in Premium</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span>Live coaching</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span>1-on-1 sessions</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span>Lifetime access</span>
                </li>
              </ul>
              <button className="btn btn-secondary w-full">
                Contact Sales
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-6">
            Ready to Transform Your English?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of students already learning with KRIN EdTech
          </p>
          <Link
            href="/auth/register"
            className="btn bg-white text-primary hover:bg-gray-100 text-lg px-8 py-3"
          >
            Start Your Free Trial Today
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="bg-gray-900 text-gray-300 py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="text-white font-bold mb-4">KRIN EdTech</h4>
              <p className="text-sm">Learn English with AI-powered education</p>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="#" className="hover:text-white">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    Pricing
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    Blog
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="#" className="hover:text-white">
                    About
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    Contact
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    Careers
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="#" className="hover:text-white">
                    Privacy
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    Terms
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-sm">
            <p>&copy; 2024 KRIN EdTech. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
