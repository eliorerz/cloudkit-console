# Security Considerations

## Authentication Token Storage

### Current Implementation
The application uses `localStorage` to store OIDC authentication tokens. This is the default behavior of the `oidc-client-ts` library.

**Location:** `src/auth/oidcConfig.ts:70` and `src/contexts/AuthContext.tsx`

### Security Trade-offs

#### Why localStorage?
- **Standards Compliance**: This follows the OIDC implicit flow standard pattern
- **Library Default**: The `oidc-client-ts` library uses localStorage by default via `WebStorageStateStore`
- **Persistence**: Tokens survive page refreshes, providing better UX
- **Cross-tab Support**: Multiple tabs can share the same authentication state

#### Known Risks
- **XSS Vulnerability**: If an XSS attack occurs, malicious scripts can read localStorage and steal tokens
- **No HttpOnly Protection**: Unlike cookies with HttpOnly flag, localStorage is accessible to JavaScript

#### Mitigations in Place
1. **XSS Prevention**:
   - All user-generated content is properly escaped (see `src/utils/formatText.tsx`)
   - No use of `dangerouslySetInnerHTML` with untrusted data
   - Content Security Policy headers should be configured at deployment

2. **Token Expiry**: OIDC tokens have limited lifespan and automatic refresh

3. **Secure Communication**: All API calls use HTTPS with proper TLS configuration

### Alternative Approaches Considered

#### Option 1: sessionStorage
- **Pros**: Cleared when tab closes, slightly more secure against persistence attacks
- **Cons**: Breaks multi-tab support, worse UX (requires login per tab)
- **Verdict**: Not recommended - localStorage is standard for OIDC SPA applications

#### Option 2: Memory-only storage
- **Pros**: Most secure against XSS (tokens lost on page refresh)
- **Cons**: User must re-authenticate on every page reload, terrible UX
- **Verdict**: Not practical for production applications

#### Option 3: HttpOnly Cookies with Backend
- **Pros**: Most secure - tokens inaccessible to JavaScript
- **Cons**: Requires backend BFF (Backend-for-Frontend), CSRF protection needed, complex architecture
- **Verdict**: Could be considered for future architecture if security requirements increase

### Recommendations

1. **Current Approach is Acceptable** for the threat model - localStorage with OIDC is industry standard for SPAs
2. **Focus on XSS Prevention** - This is the primary attack vector
3. **Monitor for Suspicious Activity** - Implement logging and monitoring of authentication events
4. **Consider BFF Pattern** only if threat model changes or compliance requires it

### Related Files
- `src/auth/oidcConfig.ts` - OIDC configuration with localStorage
- `src/contexts/AuthContext.tsx` - Token management
- `src/utils/formatText.tsx` - XSS prevention utilities
- `src/pages/Settings.tsx` - User preferences in localStorage (non-sensitive data)
