/**
 * Token Refresher Service
 * Automatically refreshes JWT tokens at midnight Pacific Time
 * Similar to Gemini API key RPD refresh mechanism
 */

import axios from 'axios';
import store from '../redux/store';
import { logout } from '../redux/slices/authSlice';

const REFRESH_CHECK_INTERVAL = 60000; // Check every minute if it's midnight
const TOKEN_REFRESH_ENDPOINT = '/api/auth/token/refresh/';

let refreshCheckInterval = null;
let lastRefreshDate = null;

/**
 * Get the current time in Pacific Time (PT)
 * @returns {Date} Current date/time in PT
 */
export const getCurrentPacificTime = () => {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
};

/**
 * Check if it's midnight in Pacific Time (00:00 - 00:30 range)
 * @returns {boolean} True if current time is between midnight and 00:30 PT
 */
export const isMidnightPT = () => {
  const ptTime = getCurrentPacificTime();
  const hours = ptTime.getHours();
  const minutes = ptTime.getMinutes();
  
  // Consider it "midnight" if between 00:00 and 00:30
  return hours === 0 && minutes < 30;
};

/**
 * Get a normalized date string in PT (YYYY-MM-DD)
 * Used to track which date we last refreshed on
 * @returns {string} Date string in format YYYY-MM-DD (PT timezone)
 */
export const getPTDateString = () => {
  const ptTime = getCurrentPacificTime();
  return ptTime.toISOString().split('T')[0];
};

/**
 * Refresh the JWT token
 * @returns {Promise<boolean>} True if refresh was successful
 */
export const refreshAuthToken = async () => {
  try {
    const stored = localStorage.getItem('tunequest-auth');
    if (!stored) {
      return false;
    }

    const auth = JSON.parse(stored);
    if (!auth.refresh) {
      return false;
    }

    const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
    const response = await axios.post(`${baseURL}${TOKEN_REFRESH_ENDPOINT}`, {
      refresh: auth.refresh,
    });

    const newAccess = response.data?.access;
    if (!newAccess) {
      return false;
    }

    // Update localStorage with new access token
    const updated = { ...auth, token: newAccess };
    localStorage.setItem('tunequest-auth', JSON.stringify(updated));
    
    // Update the last refresh date
    localStorage.setItem('lastTokenRefreshDate', getPTDateString());
    lastRefreshDate = getPTDateString();

    return true;
  } catch (error) {
    // If refresh fails with 401 or invalid token, logout the user
    if (error.response?.status === 401 || error.message.includes('invalid')) {
      store.dispatch(logout());
    }
    
    return false;
  }
};

/**
 * Check if token needs refresh at midnight PT
 * Only refreshes once per calendar day (PT)
 * @returns {Promise<void>}
 */
export const checkAndRefreshTokenAtMidnight = async () => {
  // Only process if user has a token
  const stored = localStorage.getItem('tunequest-auth');
  if (!stored) {
    return;
  }

  const currentDatePT = getPTDateString();
  
  // Load last refresh date from localStorage if not in memory
  if (!lastRefreshDate) {
    lastRefreshDate = localStorage.getItem('lastTokenRefreshDate');
  }

  // Only refresh if we're at midnight PT AND haven't already refreshed today (PT)
  if (isMidnightPT() && lastRefreshDate !== currentDatePT) {
    await refreshAuthToken();
  }
};

/**
 * Start the token refresh scheduler
 * Runs periodic checks for midnight PT and refreshes token accordingly
 * Should be called once when the app initializes (in App.js)
 * @returns {number} The interval ID (can be used to stop the scheduler)
 */
export const startTokenRefreshScheduler = () => {
  // Clear any existing interval
  if (refreshCheckInterval) {
    return refreshCheckInterval;
  }

  // Do an immediate check in case it's already midnight PT
  checkAndRefreshTokenAtMidnight().catch(err => {
    // Silent catch
  });

  // Then set up periodic checks
  refreshCheckInterval = setInterval(() => {
    checkAndRefreshTokenAtMidnight().catch(err => {
      // Silent catch
    });
  }, REFRESH_CHECK_INTERVAL);

  return refreshCheckInterval;
};

/**
 * Stop the token refresh scheduler
 * Should be called when user logs out
 */
export const stopTokenRefreshScheduler = () => {
  if (refreshCheckInterval) {
    clearInterval(refreshCheckInterval);
    refreshCheckInterval = null;
    lastRefreshDate = null;
  }
};

/**
 * Reset the refresh tracking when user logs in/out
 */
export const resetTokenRefresher = () => {
  lastRefreshDate = null;
  localStorage.removeItem('lastTokenRefreshDate');
  stopTokenRefreshScheduler();
};

/**
 * Get scheduler status for debugging
 * @returns {object} Current scheduler state and info
 */
export const getSchedulerStatus = () => {
  return {
    isRunning: refreshCheckInterval !== null,
    currentPTTime: getCurrentPacificTime().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }),
    isMidnightNow: isMidnightPT(),
    lastRefreshDate: lastRefreshDate,
    nextCheckIn: `${(REFRESH_CHECK_INTERVAL / 1000).toFixed(0)} seconds`,
  };
};

/**
 * Calculate hours and minutes until next token refresh (midnight PT)
 * @returns {object} { hours, minutes, totalMinutes, nextRefreshTime }
 */
export const getTimeUntilNextRefresh = () => {
  const now = getCurrentPacificTime();
  const nextMidnight = new Date(now);
  nextMidnight.setHours(24, 0, 0, 0); // Set to next midnight PT

  const diffMs = nextMidnight - now;
  const totalMinutes = Math.floor(diffMs / 1000 / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return {
    hours,
    minutes,
    totalMinutes,
    nextRefreshTime: nextMidnight.toLocaleString('en-US', { 
      timeZone: 'America/Los_Angeles',
      hour: 'numeric',
      minute: '2-digit',
      meridiem: 'short'
    }),
  };
};

/**
 * Get a human-readable string for time until refresh
 * @returns {string} E.g., "2 hours 30 minutes", "45 minutes", "1 hour"
 */
export const getReadableTimeUntilRefresh = () => {
  const { hours, minutes } = getTimeUntilNextRefresh();
  
  const parts = [];
  if (hours > 0) {
    parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
  }
  if (minutes > 0) {
    parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
  }
  
  return parts.length > 0 ? parts.join(' ') : 'Less than a minute';
};

const tokenRefresher = {
  getCurrentPacificTime,
  isMidnightPT,
  getPTDateString,
  refreshAuthToken,
  checkAndRefreshTokenAtMidnight,
  startTokenRefreshScheduler,
  stopTokenRefreshScheduler,
  resetTokenRefresher,
  getSchedulerStatus,
  getTimeUntilNextRefresh,
  getReadableTimeUntilRefresh,
};

export default tokenRefresher;
