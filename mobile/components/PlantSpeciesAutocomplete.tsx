/**
 * PlantSpeciesAutocomplete Component - Rediseñado con DesignSystem
 * 
 * Autocomplete para seleccionar especies de plantas
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Modal,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { plantsAPI } from '../services/api';
import { Card, Button } from './ui';
import { Colors, Typography, BorderRadius, Spacing } from '../constants/DesignSystem';

interface PlantSpeciesAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  style?: any;
}

export const PlantSpeciesAutocomplete: React.FC<PlantSpeciesAutocompleteProps> = ({
  value,
  onChange,
  placeholder = 'Especie (opcional, ej: Monstera deliciosa...)',
  style,
}) => {
  const [speciesList, setSpeciesList] = useState<string[]>([]);
  const [filteredSpecies, setFilteredSpecies] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const inputRef = useRef<TextInput>(null);

  // Cargar lista de especies al montar
  useEffect(() => {
    const loadSpecies = async () => {
      try {
        const species = await plantsAPI.getPlantSpecies();
        setSpeciesList(species);
        setFilteredSpecies(species);
      } catch (error) {
        console.error('Error cargando especies:', error);
        // Fallback básico
        const fallback = [
          'Monstera deliciosa',
          'Ficus lyrata',
          'Epipremnum aureum',
          'Sansevieria trifasciata',
          'Echeveria elegans',
          'Pilea peperomioides',
        ];
        setSpeciesList(fallback);
        setFilteredSpecies(fallback);
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

  const handleInputChange = (text: string) => {
    setInputValue(text);
    onChange(text);
    setIsOpen(true);
  };

  const handleSelectSpecies = (species: string) => {
    setInputValue(species);
    onChange(species);
    setIsOpen(false);
    Keyboard.dismiss();
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const renderSpeciesItem = ({ item }: { item: string }) => (
    <TouchableOpacity
      style={styles.speciesOption}
      onPress={() => handleSelectSpecies(item)}
      activeOpacity={0.7}
    >
      <Ionicons name="leaf-outline" size={18} color={Colors.primary} style={styles.optionIcon} />
      <Text style={styles.speciesOptionText}>{item}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, style]}>
      <View style={styles.inputContainer}>
        <Ionicons name="search-outline" size={20} color={Colors.textSecondary} style={styles.inputIcon} />
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={inputValue}
          onChangeText={handleInputChange}
          onFocus={handleInputFocus}
          placeholder={placeholder}
          placeholderTextColor={Colors.textMuted}
          autoComplete="off"
        />
      </View>
      {isOpen && filteredSpecies.length > 0 && (
        <Modal
          visible={isOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setIsOpen(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setIsOpen(false)}
          >
            <Card variant="elevated" style={styles.dropdownContainer}>
              <View style={styles.dropdownHeader}>
                <Text style={styles.dropdownTitle}>Seleccionar especie</Text>
                <Button
                  title=""
                  onPress={() => setIsOpen(false)}
                  variant="ghost"
                  size="sm"
                  icon="close"
                  style={styles.closeButton}
                />
              </View>
              <FlatList
                data={filteredSpecies}
                renderItem={renderSpeciesItem}
                keyExtractor={(item, index) => `${item}-${index}`}
                style={styles.dropdownList}
                keyboardShouldPersistTaps="handled"
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>
                      No se encontraron especies que coincidan con "{inputValue}"
                    </Text>
                  </View>
                }
              />
            </Card>
          </TouchableOpacity>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundLighter,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.backgroundLighter,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  inputIcon: {
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: Typography.sizes.base,
    color: Colors.text,
    paddingVertical: 0,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  dropdownContainer: {
    width: '100%',
    maxHeight: '70%',
    overflow: 'hidden',
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.backgroundLighter,
  },
  dropdownTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  closeButton: {
    width: 32,
    height: 32,
    padding: 0,
  },
  dropdownList: {
    maxHeight: 400,
  },
  speciesOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.backgroundLighter,
  },
  optionIcon: {
    marginRight: Spacing.md,
  },
  speciesOptionText: {
    fontSize: Typography.sizes.base,
    color: Colors.text,
    flex: 1,
  },
  emptyContainer: {
    padding: Spacing.lg,
    alignItems: 'center',
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.sm,
    textAlign: 'center',
  },
});
