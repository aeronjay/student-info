import React, { useRef, useState } from 'react';
import { View, Modal, StyleSheet, Pressable, Animated, PanResponder, Dimensions, Text, StatusBar, useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface DraggableModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}

const SCREEN_HEIGHT = Dimensions.get('window').height;
const DRAG_THRESHOLD = 100; // Amount to drag down to dismiss

export default function DraggableModal({ visible, onClose, children, title }: DraggableModalProps) {
  const pan = useRef(new Animated.ValueXY()).current;
  const [modalHeight, setModalHeight] = useState(0);
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        // Only allow downward dragging
        if (gestureState.dy > 0) {
          Animated.event([null, { dy: pan.y }], { useNativeDriver: false })(_, gestureState);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > DRAG_THRESHOLD) {
          // User dragged down enough to dismiss
          onClose();
        } else {
          // Reset to original position
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: false,
          }).start();
        }
      },
    })
  ).current;

  // Reset pan values when modal appears
  React.useEffect(() => {
    if (visible) {
      pan.setValue({ x: 0, y: 0 });
    }
  }, [visible, pan]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <View style={styles.backdrop}>
        <Animated.View
          style={[
            styles.modalContainer,
            {
              transform: [{ translateY: pan.y }],
              paddingTop: insets.top,
              maxHeight: SCREEN_HEIGHT,
              backgroundColor: isDark ? '#1f2937' : 'white',
            },
          ]}
          onLayout={(event) => setModalHeight(event.nativeEvent.layout.height)}
        >
          <Pressable 
            style={[
              styles.modalContent,
            ]} 
            onPress={() => {}}
          >
            {/* Drag handle - placed at the top for visibility */}
            <View {...panResponder.panHandlers} style={styles.dragHandle}>
              <View style={[styles.dragIndicator, { backgroundColor: isDark ? '#4b5563' : '#ccc' }]} />
            </View>
            
            {title && (
              <View style={[styles.titleContainer, { borderBottomColor: isDark ? '#374151' : '#eee' }]}>
                <Text style={[styles.title, { color: isDark ? '#93c5fd' : '#3b82f6' }]}>{title}</Text>
              </View>
            )}
            
            {/* Modal content */}
            <View style={styles.childrenContainer}>{children}</View>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    width: '100%',
    flex: 1,
  },
  modalContent: {
    width: '100%',
    flex: 1,
  },
  dragHandle: {
    width: '100%',
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  dragIndicator: {
    width: 40,
    height: 5,
    borderRadius: 5,
  },
  childrenContainer: {
    paddingHorizontal: 20,
    flex: 1,
  },
  titleContainer: {
    padding: 15,
    borderBottomWidth: 1,
    marginBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});