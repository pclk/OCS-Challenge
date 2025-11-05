'use client';

import { useState, useEffect, useRef, KeyboardEvent } from 'react';

interface SearchableDropdownProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  id?: string;
  onEnterPress?: () => void; // Callback when Enter is pressed and option is selected
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
}: SearchableDropdownProps) {
  const [inputValue, setInputValue] = useState(value || '');
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isSelectingRef = useRef(false);

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
  const handleSelect = (option: string, moveFocus: boolean = false) => {
    isSelectingRef.current = true;
    // Set input value first to ensure it's visible
    setInputValue(option);
    // Then update the parent component
    onChange(option);
    // Close dropdown
    setShowDropdown(false);
    
    // Move focus if requested (only when Enter is pressed manually)
    if (moveFocus && onEnterPress) {
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
  };

  // Handle Enter key press
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const relevantOption = getMostRelevantOption();
      if (relevantOption) {
        // Use handleSelect with moveFocus=true to move to next field
        handleSelect(relevantOption, true);
      } else {
        // No valid match found - clear the input and value
        setInputValue('');
        onChange('');
        setShowDropdown(false);
      }
    }
  };

  // Sync input value with prop value (but don't override if user is typing or selecting)
  useEffect(() => {
    // Don't sync if we're in the middle of selecting an option
    if (isSelectingRef.current) {
      return;
    }
    
    // Only sync if the value prop changed externally (not from our own onChange)
    // Don't override if user is currently typing (inputValue has content that doesn't match value)
    const isUserTyping = inputValue.trim().length > 0 && value !== inputValue && 
                         !inputValue.toLowerCase().includes(value.toLowerCase());
    
    if (!isUserTyping && value !== inputValue) {
      // Sync when value prop is set externally (e.g., form reset)
      if (value) {
        setInputValue(value);
      } else if (!inputValue.trim()) {
        // Only clear if input is also empty
        setInputValue('');
      }
    }
  }, [value]); // Only depend on value, not inputValue to avoid loops

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        inputRef.current &&
        dropdownRef.current &&
        !inputRef.current.contains(event.target as Node) &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-white mb-1">
          {label}
        </label>
      )}
      <input
        ref={inputRef}
        id={id}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => setShowDropdown(true)}
        className="w-full px-3 py-2 border border-white/20 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#ff7301] focus:border-[#ff7301] bg-black text-white"
        placeholder={placeholder}
        required={required}
        autoComplete="off"
      />
      {showDropdown && filteredOptions.length > 0 && (
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
      {showDropdown && inputValue && filteredOptions.length === 0 && (
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

