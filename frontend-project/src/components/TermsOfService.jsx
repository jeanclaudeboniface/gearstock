import React from "react";
import { Link } from "react-router-dom";
import Logo from "./Logo";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 py-4">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <Logo size="sm" linkTo="/" />
          <Link
            to="/"
            className="text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            ← Back to Home
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-extrabold text-slate-900 mb-8">
          Terms of Service
        </h1>

        <div className="prose prose-slate max-w-none space-y-6 text-slate-600">
          <p className="text-sm text-slate-500">
            Last updated:{" "}
            {new Date().toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-slate-800">
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing and using GearStock ("the Service"), you accept and
              agree to be bound by these Terms of Service. If you do not agree
              to these terms, please do not use the Service.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-slate-800">
              2. Description of Service
            </h2>
            <p>
              GearStock is a garage management platform that provides inventory
              tracking, work order management, team collaboration, and reporting
              tools for automotive service businesses.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-slate-800">
              3. User Accounts
            </h2>
            <p>To use the Service, you must:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Create an account with accurate and complete information</li>
              <li>Maintain the security of your account credentials</li>
              <li>Notify us immediately of any unauthorized use</li>
              <li>Be at least 18 years old or have parental consent</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-slate-800">
              4. Acceptable Use
            </h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Use the Service for any unlawful purpose</li>
              <li>
                Attempt to gain unauthorized access to any part of the Service
              </li>
              <li>Interfere with or disrupt the Service</li>
              <li>Upload malicious code or content</li>
              <li>Impersonate any person or entity</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-slate-800">
              5. Data Ownership
            </h2>
            <p>
              You retain all rights to the data you input into GearStock. We do
              not claim ownership of your garage inventory, work orders, or
              business data. You grant us a license to use this data solely to
              provide the Service to you.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-slate-800">
              6. Service Availability
            </h2>
            <p>
              We strive to maintain high availability but do not guarantee
              uninterrupted access. We may perform maintenance or updates that
              temporarily affect service availability.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-slate-800">
              7. Limitation of Liability
            </h2>
            <p>
              GearStock is provided "as is" without warranties of any kind. We
              shall not be liable for any indirect, incidental, special, or
              consequential damages arising from your use of the Service.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-slate-800">
              8. Changes to Terms
            </h2>
            <p>
              We may update these Terms from time to time. We will notify you of
              any significant changes by email or through the Service. Continued
              use after changes constitutes acceptance.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-slate-800">9. Contact</h2>
            <p>
              For questions about these Terms, contact us at:{" "}
              <a
                href="mailto:legal@gearstock.app"
                className="text-blue-600 hover:underline"
              >
                legal@gearstock.app
              </a>
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-8 mt-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm">
          © {new Date().getFullYear()} GearStock. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
