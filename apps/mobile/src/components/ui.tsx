import React from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../lib/providers";
export function Screen({
  children,
  scroll = false,
}: {
  children: React.ReactNode;
  scroll?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      {scroll ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 24, gap: 20, paddingBottom: 48 }}
        >
          {children}
        </ScrollView>
      ) : (
        children
      )}
    </SafeAreaView>
  );
}
export function Heading({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        paddingHorizontal: 24,
        paddingTop: 20,
        paddingBottom: 18,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <Text
          accessibilityRole="header"
          style={{
            fontSize: 23,
            fontWeight: "700",
            letterSpacing: -0.6,
            color: colors.text,
            flex: 1,
          }}
        >
          {title}
        </Text>
        {action}
      </View>
      {!!description && (
        <Text
          style={{
            fontSize: 13,
            lineHeight: 21,
            color: colors.muted,
            marginTop: 8,
          }}
        >
          {description}
        </Text>
      )}
    </View>
  );
}
export function Button({
  label,
  onPress,
  disabled = false,
  outline = false,
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  outline?: boolean;
  accessibilityLabel?: string;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 46,
        paddingHorizontal: 18,
        paddingVertical: 12,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: outline ? colors.border : colors.accent,
        backgroundColor: outline ? "transparent" : colors.accent,
        opacity: disabled ? 0.5 : pressed ? 0.75 : 1,
        alignItems: "center",
        justifyContent: "center",
      })}
    >
      <Text
        style={{
          fontWeight: "600",
          fontSize: 14,
          color: outline ? colors.text : colors.background,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ fontSize: 13, fontWeight: "500", color: colors.text }}>
        {label}
      </Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.muted}
        {...props}
        style={[
          {
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 14,
            padding: 14,
            minHeight: 48,
            color: colors.text,
            fontSize: 15,
            backgroundColor: colors.background,
          },
          props.style,
        ]}
      />
    </View>
  );
}
export function Status({
  loading,
  error,
  empty,
  onRetry,
}: {
  loading?: boolean;
  error?: string;
  empty?: string;
  onRetry?: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ padding: 24, gap: 16 }}>
      {loading && (
        <ActivityIndicator
          color={colors.accent}
          accessibilityLabel="Memuat konten"
        />
      )}
      {!!error && (
        <Text
          accessibilityRole="alert"
          style={{ color: colors.danger, fontSize: 14, lineHeight: 23 }}
        >
          {error}
        </Text>
      )}
      {!!empty && (
        <Text style={{ color: colors.muted, fontSize: 14, lineHeight: 23 }}>
          {empty}
        </Text>
      )}
      {!!error && onRetry && (
        <Button outline label="Coba lagi" onPress={onRetry} />
      )}
    </View>
  );
}
