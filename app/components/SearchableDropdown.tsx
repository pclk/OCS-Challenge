'use client';

import { useState, useEffect, useRef, useCallback, KeyboardEvent } from 'react';

interface SearchableDropdownProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  id?: string;
  onEnterPress?: () => void; // Callback when Enter is pressed and option is selected
  loading?: boolean; // Whether options are still loading
  disabled?: boolean; // Whether the input is disabled
  noMatchesMessage?: string; // Custom message when no matches are found
  onNoMatchesAction?: (inputValue: string) => void; // Action to perform when no matches (e.g., show report modal), receives the input value
  uppercase?: boolean; // Whether to convert input to uppercase
}

export default function SearchableDropdown({
  options,
  value,
  onChange,
  placeholder = 'Search or select...',
  label,
  required = false,
  id,
  onEnterPress,
  loading = false,
  disabled = false,
  noMatchesMessage,
  onNoMatchesAction,
  uppercase = false,
}: SearchableDropdownProps) {
  const [inputValue, setInputValue] = useState(value || '');
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isSelectingRef = useRef(false);
  const previousValueRef = useRef<string>(value || '');

  // Filter options based on input - prioritize exact matches and prefix matches
  const getFilteredOptions = () => {
    const lowerInput = inputValue.toLowerCase().trim();
    if (!lowerInput) return options;
    
    return options
      .map((option) => ({
        option,
        lowerOption: option.toLowerCase(),
        startsWith: option.toLowerCase().startsWith(lowerInput),
        exactMatch: option.toLowerCase() === lowerInput,
      }))
      .filter(({ lowerOption }) => lowerOption.includes(lowerInput))
      .sort((a, b) => {
        // Exact match first
        if (a.exactMatch && !b.exactMatch) return -1;
        if (!a.exactMatch && b.exactMatch) return 1;
        // Then prefix matches
        if (a.startsWith && !b.startsWith) return -1;
        if (!a.startsWith && b.startsWith) return 1;
        // Then alphabetical
        return a.lowerOption.localeCompare(b.lowerOption);
      })
      .map(({ option }) => option);
  };

  const filteredOptions = getFilteredOptions();

  // Find most relevant option (only used when Enter is pressed)
  const getMostRelevantOption = (): string => {
    if (!inputValue.trim()) return '';
    
    // Return first filtered option (already sorted by relevance)
    // Convert to uppercase if uppercase prop is enabled
    if (filteredOptions.length > 0) {
      return uppercase ? filteredOptions[0].toUpperCase() : filteredOptions[0];
    }
    
    return '';
  };

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    const processedInput = uppercase ? input.toUpperCase() : input;
    setInputValue(processedInput);
    setShowDropdown(true);
    // Don't auto-select on typing - only clear selection if input doesn't match current value
    if (processedInput !== value) {
      onChange('');
    }
  };

  // Handle option selection
  const handleSelect = useCallback((option: string) => {
    isSelectingRef.current = true;
    // Convert to uppercase if uppercase prop is enabled
    const processedOption = uppercase ? option.toUpperCase() : option;
    // Set input value first to ensure it's visible
    setInputValue(processedOption);
    // Then update the parent component
    onChange(processedOption);
    // Close dropdown
    setShowDropdown(false);
    
    // Always move focus if value exists and callback provided
    if (processedOption && onEnterPress) {
      setTimeout(() => {
        inputRef.current?.blur();
        isSelectingRef.current = false;
        onEnterPress();
      }, 50);
    } else {
      // Small delay before blurring to ensure input value is set
      setTimeout(() => {
        inputRef.current?.blur();
        isSelectingRef.current = false;
      }, 50);
    }
  }, [onChange, onEnterPress, uppercase]);

  // Shared logic for confirming selection (Enter key or click outside)
  const handleConfirmSelection = useCallback(() => {
    const relevantOption = getMostRelevantOption();
    if (relevantOption) {
      handleSelect(relevantOption); // Will now always move focus if value exists
    } else {
      // No valid match - check if we should trigger the no matches action
      if (inputValue.trim() && filteredOptions.length === 0 && onNoMatchesAction) {
        // Trigger the action (e.g., show report modal) and pass the input value
        onNoMatchesAction(inputValue.trim());
        setShowDropdown(false);
    } else {
      // No valid match - clear but don't move focus
      setInputValue('');
      onChange('');
      setShowDropdown(false);
    }
    }
  }, [inputValue, filteredOptions, handleSelect, onChange, onNoMatchesAction]);

  // Handle Enter key press
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // If there's no match and we have a no matches action, trigger it directly
      if (inputValue.trim() && filteredOptions.length === 0 && onNoMatchesAction) {
        onNoMatchesAction(inputValue.trim());
        setShowDropdown(false);
      } else {
      handleConfirmSelection();
      }
    }
  };

  // Sync input value with prop value (but don't override if user is typing or selecting)
  useEffect(() => {
    // Don't sync if we're in the middle of selecting an option
    if (isSelectingRef.current) {
      previousValueRef.current = value || '';
      return;
    }
    
    // If value changed from non-empty to empty, it's a form reset - clear inputValue
    if (!value && previousValueRef.current && inputValue.trim().length > 0) {
      setInputValue('');
      setShowDropdown(false);
      previousValueRef.current = '';
      return;
    }
    
    // Only sync if the value prop changed externally (not from our own onChange)
    // Don't override if user is currently typing (inputValue has content that doesn't match value)
    if (value && value !== inputValue) {
      // Check if user is actively typing
      // User is typing if: inputValue has content, value is empty (cleared by handleInputChange), 
      // or inputValue doesn't match/contain value
      const isUserTyping = inputValue.trim().length > 0 && 
                           !inputValue.toLowerCase().includes(value.toLowerCase()) &&
                           value.toLowerCase() !== inputValue.toLowerCase();
      
      if (!isUserTyping) {
        // Sync when value prop is set externally (e.g., auto-fill or form reset with new value)
        // Convert to uppercase if uppercase prop is enabled
        const syncedValue = uppercase ? value.toUpperCase() : value;
        setInputValue(syncedValue);
        // Ensure dropdown closes when value is set externally (auto-fill scenario)
        setShowDropdown(false);
      }
    }
    
    // Update previous value ref
    previousValueRef.current = value || '';
  }, [value, inputValue, uppercase]); // Include uppercase to handle conversion

  // Close dropdown when clicking outside (with same behavior as Enter key)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        inputRef.current &&
        dropdownRef.current &&
        !inputRef.current.contains(event.target as Node) &&
        !dropdownRef.current.contains(event.target as Node) &&
        showDropdown // Only process if dropdown is open
      ) {
        handleConfirmSelection(); // Same behavior as Enter key
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown, handleConfirmSelection]);

  return (
    <div className="relative">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-white mb-1">
          {label}
        </label>
      )}
      <div className="relative">
        {uppercase && id && (
          <style dangerouslySetInnerHTML={{
            __html: `#${id}::placeholder { text-transform: none !important; }`
          }} />
        )}
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowDropdown(true)}
          className={`w-full px-3 py-2 pr-10 border border-white/20 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#ff7301] focus:border-[#ff7301] bg-black text-white ${uppercase ? 'uppercase' : ''}`}
          style={uppercase ? { textTransform: 'uppercase' } : {}}
          placeholder={placeholder}
          required={required}
          autoComplete="off"
          disabled={loading || disabled}
        />
        {loading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <svg
              className="animate-spin h-5 w-5 text-[#ff7301]"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          </div>
        )}
      </div>
      {loading && showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute z-10 w-full mt-1 bg-black border border-white/20 rounded-md shadow-lg p-3"
        >
          <div className="flex items-center justify-center space-x-2">
            <svg
              className="animate-spin h-5 w-5 text-[#ff7301]"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <p className="text-white/70 text-sm">Loading options...</p>
          </div>
        </div>
      )}
      {!loading && showDropdown && filteredOptions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-10 w-full mt-1 bg-black border border-white/20 rounded-md shadow-lg max-h-60 overflow-auto"
        >
          {filteredOptions.map((option, index) => {
            const isMostRelevant = index === 0 && inputValue.trim().length > 0;
            const isSelected = value === option;
            return (
              <button
                key={option}
                type="button"
                onClick={() => handleSelect(option)}
                className={`w-full text-left px-3 py-2 hover:bg-[#ff7301]/20 ${
                  isSelected
                    ? 'bg-[#ff7301]/30 text-[#ff7301]'
                    : isMostRelevant
                    ? 'bg-[#ff7301]/20 text-[#ff7301]'
                    : 'text-white'
                }`}
              >
                {option}
              </button>
            );
          })}
        </div>
      )}
      {!loading && showDropdown && inputValue && filteredOptions.length === 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-10 w-full mt-1 bg-black border border-white/20 rounded-md shadow-lg p-3"
        >
          {noMatchesMessage ? (
            <button
              type="button"
              onClick={() => onNoMatchesAction?.(inputValue.trim())}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && onNoMatchesAction) {
                  e.preventDefault();
                  onNoMatchesAction(inputValue.trim());
                }
              }}
              className="text-left w-full text-[#ff7301] hover:text-[#ff7301]/80 text-sm transition-colors underline"
            >
              {noMatchesMessage}
            </button>
          ) : (
          <p className="text-white/70 text-sm">No matching options found</p>
          )}
        </div>
      )}
    </div>
  );
}

