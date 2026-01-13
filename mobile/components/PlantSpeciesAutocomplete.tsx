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
import { plantsAPI } from '../services/api';
import { Ionicons } from '@expo/vector-icons';

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
      <Ionicons name="leaf-outline" size={18} color="#4caf50" style={styles.optionIcon} />
      <Text style={styles.speciesOptionText}>{item}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, style]}>
      <TextInput
        ref={inputRef}
        style={styles.input}
        value={inputValue}
        onChangeText={handleInputChange}
        onFocus={handleInputFocus}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        autoComplete="off"
      />
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
            <View style={styles.dropdownContainer}>
              <View style={styles.dropdownHeader}>
                <Text style={styles.dropdownTitle}>Seleccionar especie</Text>
                <TouchableOpacity onPress={() => setIsOpen(false)}>
                  <Ionicons name="close" size={24} color="#fff" />
                </TouchableOpacity>
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
            </View>
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
  input: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 18,
    fontSize: 16,
    color: '#fff',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#334155',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dropdownContainer: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    width: '100%',
    maxHeight: '70%',
    borderWidth: 2,
    borderColor: '#334155',
    overflow: 'hidden',
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  dropdownTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  dropdownList: {
    maxHeight: 400,
  },
  speciesOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  optionIcon: {
    marginRight: 12,
  },
  speciesOptionText: {
    fontSize: 16,
    color: '#fff',
    flex: 1,
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
  },
});
