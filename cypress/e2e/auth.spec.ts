/// <reference types="cypress" />

describe('User Authentication Flow', () => {
    const email = `testuser+${Date.now()}@example.com`;
    const password = 'testpassword';
  
    it('registers a new user', () => {
      cy.visit('/register');
      cy.get('input[type="email"]').type(email);
      cy.get('input[type="password"]').type(password);
      cy.contains('Sign Up').click();
      // Optionally, check for a success message or redirect
    });
  
    it('logs in with valid credentials', () => {
      cy.visit('/login');
      cy.get('input[type="email"]').type(email);
      cy.get('input[type="password"]').type(password);
      cy.contains('Sign In').click();
      // Optionally, check for dashboard or user-specific content
    });
  
    it('logs out and is redirected', () => {
      cy.contains('Logout').click();
      cy.url().should('include', '/login');
    });
  
    it('prevents access to protected route when logged out', () => {
      cy.visit('/dashboard');
      cy.url().should('include', '/login');
    });
  
    it('sends password reset email', () => {
      cy.visit('/reset-password');
      cy.get('input[type="email"]').type(email);
      cy.contains('Send Reset Email').click();
      cy.contains('Password reset email sent').should('exist');
    });
  
    it('persists session after reload', () => {
      // Log in first
      cy.visit('/login');
      cy.get('input[type="email"]').type(email);
      cy.get('input[type="password"]').type(password);
      cy.contains('Sign In').click();
      // Reload the page
      cy.reload();
      // Should still be logged in (e.g., dashboard or logout button visible)
      cy.contains('Logout').should('exist');
    });
  
    // Optionally, test auto-logout/session expiry if you can set a short expiry in Supabase
  });