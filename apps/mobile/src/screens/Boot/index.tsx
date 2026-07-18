import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useEffect} from 'react';
import {ActivityIndicator, Text, View} from 'react-native';
import {APP_NAME, APP_TAGLINE, COLORS} from '../../constants';
import type {RootStackParamList} from '../../navigation/types';
import {useAuthStore} from '../../store';
import {styles} from './styles';

type Props = NativeStackScreenProps<RootStackParamList, 'Boot'>;

export function Boot({navigation}: Props) {
  const hasHydrated = useAuthStore(state => state.hasHydrated);
  const accessToken = useAuthStore(state => state.accessToken);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }
    navigation.replace(accessToken ? 'Main' : 'Welcome');
  }, [hasHydrated, accessToken, navigation]);

  return (
    <View style={styles.container}>
      <Text accessibilityRole="header" style={styles.title}>
        {APP_NAME}
      </Text>
      <Text style={styles.body}>{APP_TAGLINE}</Text>
      <ActivityIndicator
        color={COLORS.primary}
        size="large"
        style={styles.spinner}
      />
    </View>
  );
}

export default Boot;
