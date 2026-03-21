import React, { useState, useEffect } from 'react';
import {
  ScrollView,
  Text,
  TextInput,
  View,
  ActivityIndicator,
  Linking,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { VrittWebPanel } from '@/components/ui/VrittWebPanel';
import { useIsDesktopWeb } from '@/hooks/useIsDesktopWeb';

export default function ExploreScreen() {
  const isDesktopWeb = useIsDesktopWeb();
  const [search, setSearch] = useState('');
  const [articles, setArticles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        // NOTA: Reemplaza 'TU_API_KEY' con una key gratuita de https://newsapi.org
        // Usamos 'business' y 'mx' para noticias de negocios en México
        const response = await fetch(
          'https://newsapi.org/v2/everything?q=negocios OR finanzas OR mercado&language=es&sortBy=publishedAt&apiKey=16eab0279e0a4c23b14ec13dd008625f'
        );
        
        const data = await response.json();
        
        if (data.status === 'ok') {
          // Tomamos solo las primeras 5 noticias para no saturar la pantalla
          setArticles(data.articles.slice(0, 5));
        } else {
          setError('No se pudieron cargar las noticias.');
        }
      } catch (err) {
        setError('Error de conexión.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNews();
  }, []);

  return (
    <ScrollView
      className={`flex-1 ${isDesktopWeb ? '' : 'bg-black'}`}
      contentContainerStyle={[
        styles.scrollContent,
        isDesktopWeb && styles.desktopScrollContent,
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <View
        className="w-full px-6 pt-24 md:items-center"
        style={isDesktopWeb ? styles.desktopViewport : undefined}
      >
        <VrittWebPanel style={styles.desktopPanel}>
          <View
            className="w-full md:max-w-3xl"
            style={isDesktopWeb ? styles.desktopContent : undefined}
          >
            {/* Header */}
            <View className="mb-7 gap-2.5">
              <Text className="text-[12px] font-bold uppercase tracking-[3px] text-[#7A7A7A]">
                VERITT
              </Text>

              <Text className="text-[34px] font-extrabold leading-[38px] tracking-[-1.2px] text-white md:text-5xl md:leading-[54px]">
                Lo relevante, sin ruido.
              </Text>

              <Text className="max-w-[92%] text-[15px] leading-[22px] text-[#8C8C8C] md:max-w-2xl md:text-base md:leading-7">
                Noticias, ideas y señales útiles para entender mejor tu operación.
              </Text>
            </View>

            {/* Search Bar */}
            <View className="mb-7 h-14 flex-row items-center rounded-[18px] border border-[#1D1D1D] bg-[#0B0B0B] px-4">
              <Ionicons name="search" size={18} color="#6A6A6A" />
              <TextInput
                className="ml-3 flex-1 text-[15px] text-white outline-none"
                placeholder="Buscar tema, noticia o tendencia"
                placeholderTextColor="#666666"
                value={search}
                onChangeText={setSearch}
                autoCapitalize="none"
                autoCorrect={false}
                selectionColor="#FFFFFF"
              />
            </View>

            {/* Feed Section */}
            <View className="gap-4">
              <Text className="mb-1 text-[11px] font-bold uppercase tracking-[1.2px] text-[#6A6A6A]">
                Ahora mismo
              </Text>

              {isLoading ? (
                <View className="py-10 items-center justify-center">
                  <ActivityIndicator size="large" color="#6A6A6A" />
                </View>
              ) : error ? (
                <View className="rounded-[22px] border border-[#1D1D1D] bg-[#0B0B0B] p-5">
                  <Text className="text-[14px] text-red-400">{error}</Text>
                </View>
              ) : (
                articles.map((article, index) => (
                  <TouchableOpacity
                    key={index}
                    activeOpacity={0.7}
                    onPress={() => article.url && Linking.openURL(article.url)}
                    className="rounded-[22px] border border-[#1D1D1D] bg-[#0B0B0B] p-5"
                  >
                    <Text
                      className="mb-2.5 text-[18px] font-bold text-white"
                      numberOfLines={2}
                    >
                      {article.title}
                    </Text>

                    <Text
                      className="mb-4 text-[14px] leading-[22px] text-[#8C8C8C] md:text-[15px] md:leading-7"
                      numberOfLines={3}
                    >
                      {article.description || 'Da clic para leer la noticia completa...'}
                    </Text>

                    <View className="flex-row items-center justify-between">
                      <Text className="text-[11px] font-bold uppercase tracking-[1px] text-[#5A5A5A]">
                        {article.source?.name || 'Fuente Desconocida'}
                      </Text>
                      {/* Formateo rápido de fecha */}
                      <Text className="text-[11px] text-[#5A5A5A]">
                        {new Date(article.publishedAt).toLocaleDateString('es-MX')}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}

              {/* Tarjeta estática original para mantener algo de tu visión inicial */}
              <View className="mt-4 rounded-[22px] border border-dashed border-[#1D1D1D] bg-transparent p-5 opacity-70">
                <Text className="mb-2.5 text-[18px] font-bold text-white">
                  Próximamente
                </Text>
                <Text className="text-[14px] leading-[22px] text-[#8C8C8C] md:text-[15px] md:leading-7">
                  Búsqueda inteligente, insights curados y contenido útil para crecer
                  con más claridad y menos ruido.
                </Text>
              </View>
            </View>
          </View>
        </VrittWebPanel>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 140,
  },
  desktopScrollContent: {
    flexGrow: 1,
    alignItems: 'center',
  },
  desktopViewport: {
    width: '100%',
    alignSelf: 'center',
  },
  desktopPanel: {
    width: '100%',
  },
  desktopContent: {
    width: '100%',
    maxWidth: 1080,
  },
});
