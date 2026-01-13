import React, { useState, useEffect, useRef } from 'react';
import { plantsAPI } from '../services/api';
import './PlantSpeciesAutocomplete.css';

interface PlantSpeciesAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const PlantSpeciesAutocomplete: React.FC<PlantSpeciesAutocompleteProps> = ({
  value,
  onChange,
  placeholder = 'Especie (opcional, ej: Monstera deliciosa...)',
  className = '',
}) => {
  const [speciesList, setSpeciesList] = useState<string[]>([]);
  const [filteredSpecies, setFilteredSpecies] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Cargar lista de especies al montar
  useEffect(() => {
    const loadSpecies = async () => {
      try {
        const species = await plantsAPI.getPlantSpecies();
        setSpeciesList(species);
        setFilteredSpecies(species);
      } catch (error) {
        console.error('Error cargando especies:', error);
        // Si falla, usar lista básica como fallback
        setSpeciesList([
          'Monstera deliciosa',
          'Ficus lyrata',
          'Epipremnum aureum',
          'Sansevieria trifasciata',
          'Echeveria elegans',
          'Pilea peperomioides',
        ]);
        setFilteredSpecies([
          'Monstera deliciosa',
          'Ficus lyrata',
          'Epipremnum aureum',
          'Sansevieria trifasciata',
          'Echeveria elegans',
          'Pilea peperomioides',
        ]);
      }
    };
    loadSpecies();
  }, []);

  // Filtrar especies según el input
  useEffect(() => {
    if (!inputValue.trim()) {
      setFilteredSpecies(speciesList);
      return;
    }

    const searchTerm = inputValue.toLowerCase().trim();
    const filtered = speciesList.filter((species) =>
      species.toLowerCase().includes(searchTerm)
    );
    setFilteredSpecies(filtered);
  }, [inputValue, speciesList]);

  // Sincronizar inputValue con value prop
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);
    setIsOpen(true);
  };

  const handleSelectSpecies = (species: string) => {
    setInputValue(species);
    onChange(species);
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const handleInputBlur = () => {
    // Delay para permitir que el click en la opción se registre
    setTimeout(() => setIsOpen(false), 200);
  };

  return (
    <div className={`plant-species-autocomplete ${className}`} ref={wrapperRef}>
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
        placeholder={placeholder}
        className="species-input"
        autoComplete="off"
      />
      {isOpen && filteredSpecies.length > 0 && (
        <div className="species-dropdown">
          {filteredSpecies.slice(0, 10).map((species, index) => (
            <div
              key={index}
              className="species-option"
              onClick={() => handleSelectSpecies(species)}
              onMouseDown={(e) => e.preventDefault()} // Prevenir blur antes del click
            >
              {species}
            </div>
          ))}
          {filteredSpecies.length > 10 && (
            <div className="species-option-more">
              +{filteredSpecies.length - 10} más...
            </div>
          )}
        </div>
      )}
      {isOpen && inputValue.trim() && filteredSpecies.length === 0 && (
        <div className="species-dropdown">
          <div className="species-option-empty">
            No se encontraron especies que coincidan con "{inputValue}"
          </div>
        </div>
      )}
    </div>
  );
};
