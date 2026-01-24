import { addDays, addWeeks, startOfDay, nextDay, getDay } from 'date-fns';

// Day abbreviation mappings
export const DAY_ABBREVIATIONS: Record<string, number> = {
  sun: 0, sunday: 0,
  mon: 1, monday: 1,
  tue: 2, tues: 2, tuesday: 2,
  wed: 3, wednesday: 3,
  thu: 4, thur: 4, thurs: 4, thursday: 4,
  fri: 5, friday: 5,
  sat: 6, saturday: 6,
};

// Month abbreviation mappings
export const MONTH_ABBREVIATIONS: Record<string, number> = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

// Natural language date parsing result
export interface ParsedDateResult {
  title: string;
  scheduledDate: Date | null;
  datePhrase: string | null;
}

// Full task input parsing result
export interface ParsedTaskInput {
  cleanTitle: string;
  tags: string[];
  projectName: string | null;
  areaName: string | null;
  scheduledDate: Date | null;
  deadline: Date | null;
  url: string | null;
}

/**
 * Get the next occurrence of a specific day of the week
 */
export function getNextDayOccurrence(dayIndex: number, weeksAhead: number = 0): Date {
  const today = startOfDay(new Date());
  const todayDay = getDay(today);
  
  // If it's the same day of the week, get next week's occurrence
  if (todayDay === dayIndex) {
    return addWeeks(today, 1 + weeksAhead);
  }
  
  // Get the next occurrence of this day
  const next = nextDay(today, dayIndex as 0 | 1 | 2 | 3 | 4 | 5 | 6);
  return addWeeks(next, weeksAhead);
}

/**
 * Parse natural language date expressions from text
 * Returns the cleaned title and parsed date
 */
export function parseDateFromText(text: string): ParsedDateResult {
  const today = startOfDay(new Date());
  
  // Patterns to match (order matters - more specific first)
  const patterns: Array<{ regex: RegExp; getDate: (match: RegExpMatchArray) => Date | null }> = [
    // "next week"
    {
      regex: /\bnext\s+week\b/i,
      getDate: () => addWeeks(today, 1),
    },
    // "next monday", "next tue", etc.
    {
      regex: /\bnext\s+(sun(?:day)?|mon(?:day)?|tue(?:s(?:day)?)?|wed(?:nesday)?|thu(?:r(?:s(?:day)?)?)?|fri(?:day)?|sat(?:urday)?)\b/i,
      getDate: (match) => {
        const dayStr = match[1].toLowerCase();
        for (const [abbrev, dayIndex] of Object.entries(DAY_ABBREVIATIONS)) {
          if (dayStr === abbrev || dayStr.startsWith(abbrev)) {
            return getNextDayOccurrence(dayIndex, 1); // Skip to the one after next
          }
        }
        return null;
      },
    },
    // "21 jun", "21 june", "21st june", "21jun", etc.
    {
      regex: /\b(\d{1,2})(?:st|nd|rd|th)?\s*(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/i,
      getDate: (match) => {
        const day = parseInt(match[1], 10);
        const monthStr = match[2].toLowerCase();
        let monthIndex = -1;
        for (const [abbrev, idx] of Object.entries(MONTH_ABBREVIATIONS)) {
          if (monthStr === abbrev || monthStr.startsWith(abbrev.slice(0, 3))) {
            monthIndex = idx;
            break;
          }
        }
        if (monthIndex === -1 || day < 1 || day > 31) return null;
        
        const year = new Date().getFullYear();
        let date = new Date(year, monthIndex, day);
        // If the date has passed, use next year
        if (date < today) {
          date = new Date(year + 1, monthIndex, day);
        }
        return startOfDay(date);
      },
    },
    // "jun 21", "june 21st", "jun21", etc.
    {
      regex: /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s*(\d{1,2})(?:st|nd|rd|th)?\b/i,
      getDate: (match) => {
        const monthStr = match[1].toLowerCase();
        const day = parseInt(match[2], 10);
        let monthIndex = -1;
        for (const [abbrev, idx] of Object.entries(MONTH_ABBREVIATIONS)) {
          if (monthStr === abbrev || monthStr.startsWith(abbrev.slice(0, 3))) {
            monthIndex = idx;
            break;
          }
        }
        if (monthIndex === -1 || day < 1 || day > 31) return null;
        
        const year = new Date().getFullYear();
        let date = new Date(year, monthIndex, day);
        // If the date has passed, use next year
        if (date < today) {
          date = new Date(year + 1, monthIndex, day);
        }
        return startOfDay(date);
      },
    },
    // Day names: "monday", "mon", "tue", etc.
    {
      regex: /\b(sun(?:day)?|mon(?:day)?|tue(?:s(?:day)?)?|wed(?:nesday)?|thu(?:r(?:s(?:day)?)?)?|fri(?:day)?|sat(?:urday)?)\b/i,
      getDate: (match) => {
        const dayStr = match[1].toLowerCase();
        for (const [abbrev, dayIndex] of Object.entries(DAY_ABBREVIATIONS)) {
          if (dayStr === abbrev) {
            return getNextDayOccurrence(dayIndex, 0);
          }
        }
        return null;
      },
    },
    // "today", "tod"
    {
      regex: /\b(today|tod)\b/i,
      getDate: () => today,
    },
    // "tomorrow", "tom", "tmr", "tmrw"
    {
      regex: /\b(tomorrow|tom|tmr|tmrw)\b/i,
      getDate: () => addDays(today, 1),
    },
  ];
  
  for (const { regex, getDate } of patterns) {
    const match = text.match(regex);
    if (match) {
      const date = getDate(match);
      if (date) {
        // Remove the matched phrase from the title
        const cleanedTitle = text.replace(regex, '').replace(/\s+/g, ' ').trim();
        return {
          title: cleanedTitle,
          scheduledDate: date,
          datePhrase: match[0],
        };
      }
    }
  }
  
  return {
    title: text,
    scheduledDate: null,
    datePhrase: null,
  };
}

// URL regex pattern to detect http/https URLs
export const URL_REGEX = /https?:\/\/[^\s]+/gi;

/**
 * Parse a full task input string to extract all metadata
 * This includes tags (#), locations (@), dates, deadlines (d/), and URLs
 */
export function parseTaskInput(input: string): ParsedTaskInput {
  // Extract URL from input (first match only)
  const urlMatches = input.match(URL_REGEX);
  const url = urlMatches?.[0] ?? null;
  
  // Parse all tags from input
  const tags = input.match(/#(\w+)/g)?.map(t => t.slice(1).toLowerCase()) || [];
  
  // Parse location from input (e.g., "@dev" or "@gamedev")
  const locationMatch = input.match(/@(\w+)/);
  const locationName = locationMatch?.[1]?.toLowerCase() ?? null;
  
  // Get title without tags, location, and URLs
  let titleWithoutMeta = input
    .replace(/#\w+\s*/g, '')
    .replace(/@\w+\s*/g, '')
    .replace(URL_REGEX, '')
    .trim();
  
  // Parse deadline from d/ syntax (e.g., "d/mon", "d/tom", "d/23jun")
  const deadlineMatch = titleWithoutMeta.match(/\bd\/(\S+)/i);
  let deadline: Date | null = null;
  
  if (deadlineMatch) {
    const dateStr = deadlineMatch[1];
    const dateResult = parseDateFromText(dateStr);
    deadline = dateResult.scheduledDate;
    titleWithoutMeta = titleWithoutMeta.replace(/\bd\/\S+\s*/i, '').trim();
  }
  
  // Parse scheduled date from the remaining title
  const parsedDate = parseDateFromText(titleWithoutMeta);
  const cleanTitle = parsedDate.title;
  
  return {
    cleanTitle,
    tags,
    projectName: locationName, // Will be resolved to project or area by the caller
    areaName: locationName,    // Will be resolved to project or area by the caller
    scheduledDate: parsedDate.scheduledDate,
    deadline,
    url,
  };
}

/**
 * Check if input is currently typing a tag (ends with #word)
 */
export function isTypingTag(input: string): { isTyping: boolean; query: string } {
  const match = input.match(/#(\w*)$/);
  return {
    isTyping: match !== null,
    query: match?.[1]?.toLowerCase() || '',
  };
}

/**
 * Check if input is currently typing a location (ends with @word)
 */
export function isTypingLocation(input: string): { isTyping: boolean; query: string } {
  const match = input.match(/@(\w*)$/);
  return {
    isTyping: match !== null,
    query: match?.[1]?.toLowerCase() || '',
  };
}

/**
 * Insert a tag into the input, replacing the partial #query
 */
export function insertTagIntoInput(input: string, tag: string): string {
  return input.replace(/#\w*$/, `#${tag} `);
}

/**
 * Insert a location into the input, replacing the partial @query
 */
export function insertLocationIntoInput(input: string, name: string): string {
  return input.replace(/@\w*$/, `@${name} `);
}
