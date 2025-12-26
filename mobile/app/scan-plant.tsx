/**
 * Pantalla de Scanner de Plantas
 * Multi-step flow: nombre -> foto -> identificación -> creación
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
import { plantsAPI } from '../services/api';
import { PlantIdentify } from '../types';
import { Ionicons } from '@expo/vector-icons';

type Step = 'name' | 'photo' | 'identifying' | 'results' | 'creating';

export default function ScanPlantScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('name');
  const [plantName, setPlantName] = useState('');
  const [photo, setPhoto] = useState<{ uri: string; type: string; name: string } | null>(null);
  const [identification, setIdentification] = useState<PlantIdentify | null>(null);
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
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
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
        identifyPlant(asset.uri);
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
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setPhoto({
          uri: asset.uri,
          type: asset.uri.endsWith('.png') ? 'image/png' : 'image/jpeg',
          name: asset.uri.split('/').pop() || `plant_${Date.now()}.jpg`,
        });
        setStep('identifying');
        identifyPlant(asset.uri);
      }
    } catch (error) {
      console.error('Error seleccionando imagen:', error);
      Alert.alert('Error', 'No se pudo seleccionar la imagen');
    }
  };

  const identifyPlant = async (imageUri: string) => {
    setIsLoading(true);
    try {
      // Usar el tipo de la foto seleccionada (ya tiene el tipo correcto: image/jpeg o image/png)
      const file = {
        uri: imageUri,
        type: photo?.type || 'image/jpeg',
        name: photo?.name || `plant_${Date.now()}.${photo?.type?.includes('png') ? 'png' : 'jpg'}`,
      };

      const result = await plantsAPI.identifyPlant(file);
      setIdentification(result);
      setStep('results');
    } catch (error: any) {
      console.error('Error identificando planta:', error);
      Alert.alert(
        'Error de identificación',
        error.response?.data?.detail || 'No se pudo identificar la planta. Intenta con otra foto.'
      );
      setStep('photo');
    } finally {
      setIsLoading(false);
    }
  };

  const createPlant = async () => {
    if (!photo || !plantName.trim()) {
      Alert.alert('Error', 'Faltan datos para crear la planta');
      return;
    }

    setStep('creating');
    setIsLoading(true);

    try {
      await plantsAPI.createPlant(photo, plantName.trim());
      Alert.alert('¡Éxito!', 'Tu planta ha sido agregada a tu jardín', [
        {
          text: 'OK',
          onPress: () => router.replace('/(tabs)/garden'),
        },
      ]);
    } catch (error: any) {
      console.error('Error creando planta:', error);
      Alert.alert('Error', error.response?.data?.detail || 'No se pudo crear la planta');
      setStep('results');
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 'name':
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>¿Cómo se llama tu planta?</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Mi Suculenta Favorita"
              placeholderTextColor="#666"
              value={plantName}
              onChangeText={setPlantName}
              autoFocus
            />
            <TouchableOpacity
              style={[styles.button, !plantName.trim() && styles.buttonDisabled]}
              onPress={() => setStep('photo')}
              disabled={!plantName.trim()}
            >
              <Text style={styles.buttonText}>Continuar</Text>
            </TouchableOpacity>
          </View>
        );

      case 'photo':
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Toma o selecciona una foto</Text>
            <View style={styles.photoOptions}>
              <TouchableOpacity style={styles.photoButton} onPress={takePhoto}>
                <Ionicons name="camera" size={48} color="#4caf50" />
                <Text style={styles.photoButtonText}>Tomar Foto</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.photoButton} onPress={pickFromGallery}>
                <Ionicons name="images" size={48} color="#4caf50" />
                <Text style={styles.photoButtonText}>Desde Galería</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.backButton} onPress={() => setStep('name')}>
              <Text style={styles.backButtonText}>← Volver</Text>
            </TouchableOpacity>
          </View>
        );

      case 'identifying':
        return (
          <View style={styles.stepContainer}>
            <ActivityIndicator size="large" color="#4caf50" />
            <Text style={styles.loadingText}>Identificando tu planta...</Text>
            <Text style={styles.loadingSubtext}>Esto puede tomar unos segundos</Text>
          </View>
        );

      case 'results':
        if (!identification) return null;

        return (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.resultsContent}>
            {photo && <Image source={{ uri: photo.uri }} style={styles.previewImage} />}

            <View style={styles.resultCard}>
              <Text style={styles.resultTitle}>🌿 {identification.plant_type}</Text>
              {identification.scientific_name && (
                <Text style={styles.resultSubtitle}>{identification.scientific_name}</Text>
              )}
              <Text style={styles.resultLabel}>Nivel de cuidado: {identification.care_level}</Text>
            </View>

            <View style={styles.resultCard}>
              <Text style={styles.resultCardTitle}>💡 Consejos de cuidado</Text>
              <Text style={styles.resultText}>{identification.care_tips}</Text>
            </View>

            <View style={styles.resultCard}>
              <Text style={styles.resultCardTitle}>📊 Condiciones óptimas</Text>
              <Text style={styles.resultText}>
                Humedad: {identification.optimal_humidity_min}% - {identification.optimal_humidity_max}%
              </Text>
              <Text style={styles.resultText}>
                Temperatura: {identification.optimal_temp_min}°C - {identification.optimal_temp_max}°C
              </Text>
            </View>

            <TouchableOpacity style={styles.button} onPress={createPlant}>
              <Text style={styles.buttonText}>Agregar a Mi Jardín</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                setStep('photo');
                setPhoto(null);
                setIdentification(null);
              }}
            >
              <Text style={styles.backButtonText}>← Tomar otra foto</Text>
            </TouchableOpacity>
          </ScrollView>
        );

      case 'creating':
        return (
          <View style={styles.stepContainer}>
            <ActivityIndicator size="large" color="#4caf50" />
            <Text style={styles.loadingText}>Creando tu planta...</Text>
          </View>
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
        <Text style={styles.headerTitle}>Escanear Planta</Text>
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
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepContainer: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 24,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#fff',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  photoOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 32,
  },
  photoButton: {
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 24,
    width: '45%',
    borderWidth: 1,
    borderColor: '#334155',
  },
  photoButtonText: {
    color: '#fff',
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
  },
  button: {
    backgroundColor: '#4caf50',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    padding: 16,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#4caf50',
    fontSize: 14,
  },
  loadingText: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
    marginTop: 16,
  },
  loadingSubtext: {
    color: '#b0bec5',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  resultsContent: {
    padding: 24,
    paddingBottom: 32,
    flexGrow: 1,
  },
  previewImage: {
    width: '100%',
    height: 300,
    borderRadius: 16,
    marginBottom: 24,
    backgroundColor: '#1e293b',
  },
  resultCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  resultTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4caf50',
    marginBottom: 4,
  },
  resultSubtitle: {
    fontSize: 14,
    color: '#b0bec5',
    fontStyle: 'italic',
    marginBottom: 12,
  },
  resultLabel: {
    fontSize: 14,
    color: '#b0bec5',
  },
  resultCardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  resultText: {
    fontSize: 14,
    color: '#b0bec5',
    lineHeight: 20,
    marginBottom: 4,
  },
});
