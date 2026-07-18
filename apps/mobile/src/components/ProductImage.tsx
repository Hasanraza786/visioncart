import {useState} from 'react';
import {
  Image,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {COLORS, SIZES} from '../constants';

type ProductImageProps = {
  uri?: string;
  name: string;
  style?: StyleProp<ViewStyle>;
  rounded?: boolean;
};

export function ProductImage({uri, name, style, rounded = true}: ProductImageProps) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(uri) && !failed;
  const initial = name.trim().charAt(0).toUpperCase() || 'V';

  return (
    <View
      style={[
        styles.container,
        rounded ? styles.rounded : null,
        style,
      ]}>
      {showImage ? (
        <Image
          onError={() => setFailed(true)}
          resizeMode="cover"
          source={{uri}}
          style={styles.image}
        />
      ) : (
        <Text style={styles.placeholder}>{initial}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.backgroundMuted,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  rounded: {
    borderRadius: SIZES.radius,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    color: COLORS.textSubtle,
    fontSize: SIZES.heading,
    fontWeight: '800',
  },
});
