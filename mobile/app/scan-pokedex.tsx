/**
 * Pantalla de Scanner para Pokedex
 * Similar a scan-plant pero para agregar a la pokedex (sin nombre de planta)
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { pokedexAPI } from '../services/api';
import { PokedexEntryResponse } from '../types';
import { Ionicons } from '@expo/vector-icons';
import { PlantSpeciesAutocomplete } from '../components/PlantSpeciesAutocomplete';

type Step = 'photo' | 'identifying' | 'results';

export default function ScanPokedexScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('photo');
  const [plantSpecies, setPlantSpecies] = useState('');
  const [photo, setPhoto] = useState<{ uri: string; type: string; name: string } | null>(null);
  const [entry, setEntry] = useState<PokedexEntryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const requestCameraPermission = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permisos requeridos', 'Necesitamos acceso a tu cámara para escanear plantas');
      return false;
    }
    return true;
  };

  const requestMediaLibraryPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permisos requeridos', 'Necesitamos acceso a tu galería para seleccionar imágenes');
      return false;
    }
    return true;
  };

  const takePhoto = async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setPhoto({
          uri: asset.uri,
          type: 'image/jpeg',
          name: `plant_${Date.now()}.jpg`,
        });
        setStep('identifying');
        scanPlant(asset.uri);
      }
    } catch (error) {
      console.error('Error tomando foto:', error);
      Alert.alert('Error', 'No se pudo tomar la foto');
    }
  };

  const pickFromGallery = async () => {
    const hasPermission = await requestMediaLibraryPermission();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        let imageType = 'image/jpeg';
        let extension = 'jpg';
        const uriLower = asset.uri.toLowerCase();
        if (uriLower.includes('.png')) {
          imageType = 'image/png';
          extension = 'png';
        }
        
        setPhoto({
          uri: asset.uri,
          type: imageType,
          name: asset.uri.split('/').pop() || `plant_${Date.now()}.${extension}`,
        });
        setStep('identifying');
        scanPlant(asset.uri);
      }
    } catch (error) {
      console.error('Error seleccionando imagen:', error);
      Alert.alert('Error', 'No se pudo seleccionar la imagen');
    }
  };

  const scanPlant = async (imageUri: string) => {
    setIsLoading(true);
    try {
      const file = {
        uri: imageUri,
        type: photo?.type || 'image/jpeg',
        name: photo?.name || `plant_${Date.now()}.${photo?.type?.includes('png') ? 'png' : 'jpg'}`,
      };

      const result = await pokedexAPI.scanPokedex(file, plantSpecies.trim() || undefined);
      setEntry(result);
      setStep('results');
    } catch (error: any) {
      console.error('Error escaneando planta:', error);
      
      // Manejar error 404 de forma amigable
      if (error.response?.status === 404 || error.response?.statusCode === 404) {
        Alert.alert(
          '🌱 Planta no encontrada',
          'Esta planta aún no está en nuestra Pokedex. ¡Pronto la agregaremos! Mientras tanto, puedes intentar con otra planta.',
          [
            {
              text: 'OK',
              onPress: () => setStep('photo'),
            },
          ]
        );
      } else {
        Alert.alert(
          'Error de escaneo',
          error.response?.data?.detail || 'No se pudo identificar la planta. Intenta con otra foto.',
          [
            {
              text: 'OK',
              onPress: () => setStep('photo'),
            },
          ]
        );
      }
      setStep('photo');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinish = () => {
    Alert.alert('¡Éxito!', 'Planta agregada a tu Pokedex', [
      {
        text: 'OK',
        onPress: () => router.replace('/(tabs)/pokedex'),
      },
    ]);
  };

  const renderStep = () => {
    switch (step) {
      case 'photo':
        return (
          <ScrollView style={styles.stepContainer} contentContainerStyle={styles.stepContent}>
            <View style={styles.iconContainer}>
              <View style={styles.iconCircle}>
                <Ionicons name="camera" size={48} color="#4caf50" />
              </View>
            </View>
            <Text style={styles.stepTitle}>Escanear para Pokedex</Text>
            <Text style={styles.stepDescription}>
              Toma o selecciona una foto de una planta para agregarla a tu catálogo
            </Text>
            <PlantSpeciesAutocomplete
              value={plantSpecies}
              onChange={setPlantSpecies}
              placeholder="Especie (opcional, ej: Monstera deliciosa...)"
              style={styles.input}
            />
            <Text style={styles.hintText}>
              💡 Si conoces la especie, ingrésala para una identificación más precisa
            </Text>
            <View style={styles.photoOptions}>
              <TouchableOpacity style={styles.photoButton} onPress={takePhoto} activeOpacity={0.8}>
                <View style={styles.photoButtonIcon}>
                  <Ionicons name="camera" size={40} color="#4caf50" />
                </View>
                <Text style={styles.photoButtonText}>Tomar Foto</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.photoButton} onPress={pickFromGallery} activeOpacity={0.8}>
                <View style={styles.photoButtonIcon}>
                  <Ionicons name="images" size={40} color="#4caf50" />
                </View>
                <Text style={styles.photoButtonText}>Desde Galería</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={18} color="#4caf50" />
              <Text style={styles.backButtonText}>Volver</Text>
            </TouchableOpacity>
          </ScrollView>
        );

      case 'identifying':
        return (
          <View style={styles.stepContainer}>
            <View style={styles.loadingContainer}>
              <View style={styles.loadingIconContainer}>
                <Ionicons name="leaf" size={64} color="#4caf50" />
              </View>
              <ActivityIndicator size="large" color="#4caf50" style={styles.loader} />
              <Text style={styles.loadingText}>Identificando planta...</Text>
              <Text style={styles.loadingSubtext}>Esto puede tomar unos segundos</Text>
            </View>
          </View>
        );

      case 'results':
        if (!entry) return null;

        return (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.resultsContent}>
            {photo && (
              <View style={styles.imageWrapper}>
                <Image source={{ uri: photo.uri }} style={styles.previewImage} />
                <View style={styles.imageOverlay} />
              </View>
            )}

            <View style={styles.resultCard}>
              <View style={styles.resultHeader}>
                <Ionicons name="checkmark-circle" size={32} color="#4caf50" />
                <View style={styles.resultTitleContainer}>
                  <Text style={styles.resultTitle}>{entry.plant_type}</Text>
                  {entry.scientific_name && (
                    <Text style={styles.resultSubtitle}>{entry.scientific_name}</Text>
                  )}
                </View>
              </View>
              {entry.care_level && (
                <View style={styles.careLevelBadge}>
                  <Text style={styles.careLevelText}>Nivel: {entry.care_level}</Text>
                </View>
              )}
            </View>

            {entry.care_tips && (
              <View style={styles.resultCard}>
                <View style={styles.resultCardHeader}>
                  <Ionicons name="bulb" size={24} color="#ffb74d" />
                  <Text style={styles.resultCardTitle}>Consejos de cuidado</Text>
                </View>
                <Text style={styles.resultText}>{entry.care_tips}</Text>
              </View>
            )}

            <View style={styles.resultCard}>
              <View style={styles.resultCardHeader}>
                <Ionicons name="stats-chart" size={24} color="#64b5f6" />
                <Text style={styles.resultCardTitle}>Condiciones óptimas</Text>
              </View>
              <View style={styles.conditionsRow}>
                {entry.optimal_humidity_min && entry.optimal_humidity_max && (
                  <View style={styles.conditionItem}>
                    <Ionicons name="water" size={20} color="#64b5f6" />
                    <Text style={styles.conditionText}>
                      {entry.optimal_humidity_min}% - {entry.optimal_humidity_max}%
                    </Text>
                  </View>
                )}
                {entry.optimal_temp_min && entry.optimal_temp_max && (
                  <View style={styles.conditionItem}>
                    <Ionicons name="thermometer" size={20} color="#ef5350" />
                    <Text style={styles.conditionText}>
                      {entry.optimal_temp_min}°C - {entry.optimal_temp_max}°C
                    </Text>
                  </View>
                )}
              </View>
            </View>

            <TouchableOpacity style={styles.button} onPress={handleFinish} activeOpacity={0.8}>
              <Ionicons name="checkmark-circle" size={24} color="#fff" />
              <Text style={styles.buttonText}>Agregar a Pokedex</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                setStep('photo');
                setPhoto(null);
                setEntry(null);
              }}
            >
              <Ionicons name="camera-outline" size={18} color="#4caf50" />
              <Text style={styles.backButtonText}>Escanear otra</Text>
            </TouchableOpacity>
          </ScrollView>
        );

      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Escanear para Pokedex</Text>
        <View style={styles.closeButton} />
      </View>

      {renderStep()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a1929',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 48,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    backgroundColor: '#0f172a',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: '#1e293b',
  },
  stepContainer: {
    flex: 1,
  },
  stepContent: {
    padding: 24,
    paddingTop: 32,
    flexGrow: 1,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#4caf5020',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#4caf50',
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  stepDescription: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  input: {
    marginBottom: 12,
  },
  hintText: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 16,
    lineHeight: 18,
  },
  photoOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
    gap: 16,
  },
  photoButton: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 24,
    borderWidth: 2,
    borderColor: '#334155',
  },
  photoButtonIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4caf5015',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  photoButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  button: {
    backgroundColor: '#4caf50',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    shadowColor: '#4caf50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    marginLeft: 8,
  },
  backButton: {
    padding: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  backButtonText: {
    color: '#4caf50',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingIconContainer: {
    marginBottom: 24,
  },
  loader: {
    marginVertical: 16,
  },
  loadingText: {
    color: '#fff',
    fontSize: 20,
    textAlign: 'center',
    marginTop: 16,
    fontWeight: '600',
  },
  loadingSubtext: {
    color: '#94a3b8',
    fontSize: 15,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },
  resultsContent: {
    padding: 24,
    paddingBottom: 32,
    flexGrow: 1,
  },
  imageWrapper: {
    position: 'relative',
    marginBottom: 24,
    borderRadius: 20,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: 320,
    backgroundColor: '#1e293b',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  resultCard: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  resultTitleContainer: {
    flex: 1,
    marginLeft: 12,
  },
  resultTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4caf50',
    marginBottom: 4,
  },
  resultSubtitle: {
    fontSize: 15,
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  careLevelBadge: {
    backgroundColor: '#4caf5015',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  careLevelText: {
    color: '#4caf50',
    fontSize: 14,
    fontWeight: '600',
  },
  resultCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  resultCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginLeft: 10,
  },
  resultText: {
    fontSize: 15,
    color: '#cbd5e1',
    lineHeight: 24,
  },
  conditionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  conditionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    flex: 1,
    marginHorizontal: 4,
  },
  conditionText: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
});
