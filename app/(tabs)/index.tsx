import { View, Text, StyleSheet } from 'react-native'
import React from 'react'

const App = () => {
  return (
    <View style={styles.containter}>
      <Text style={styles.text}>App</Text>
    </View>
  )
}

export default App

const styles = StyleSheet.create({
    containter: {
        flex: 1,
        backgroundColor: 'white',
        alignItems: 'center',
        justifyContent: 'center',
    },
    text: {
        color: 'black',
        fontSize: 40,
        fontWeight: 'bold',
        textAlign: 'center',
        
    }
})