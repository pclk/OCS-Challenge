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
    if (filteredOptions.length > 0) return filteredOptions[0];
    
    return '';
  };

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    setInputValue(input);
    setShowDropdown(true);
    // Don't auto-select on typing - only clear selection if input doesn't match current value
    if (input !== value) {
      onChange('');
    }
  };

  // Handle option selection
  const handleSelect = useCallback((option: string) => {
    isSelectingRef.current = true;
    // Set input value first to ensure it's visible
    setInputValue(option);
    // Then update the parent component
    onChange(option);
    // Close dropdown
    setShowDropdown(false);
    
    // Always move focus if value exists and callback provided
    if (option && onEnterPress) {
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
  }, [onChange, onEnterPress]);

  // Shared logic for confirming selection (Enter key or click outside)
  const handleConfirmSelection = useCallback(() => {
    const relevantOption = getMostRelevantOption();
    if (relevantOption) {
      handleSelect(relevantOption); // Will now always move focus if value exists
    } else {
      // No valid match - clear but don't move focus
      setInputValue('');
      onChange('');
      setShowDropdown(false);
    }
  }, [inputValue, filteredOptions, handleSelect, onChange]);

  // Handle Enter key press
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleConfirmSelection();
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
        setInputValue(value);
        // Ensure dropdown closes when value is set externally (auto-fill scenario)
        setShowDropdown(false);
      }
    }
    
    // Update previous value ref
    previousValueRef.current = value || '';
  }, [value, inputValue]); // Include inputValue to check typing state

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
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowDropdown(true)}
          className="w-full px-3 py-2 pr-10 border border-white/20 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#ff7301] focus:border-[#ff7301] bg-black text-white"
          placeholder={placeholder}
          required={required}
          autoComplete="off"
          disabled={loading}
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
          <p className="text-white/70 text-sm">No matching options found</p>
        </div>
      )}
    </div>
  );
}

