import SwiftUI

struct SettingsView: View {
    @Binding var showSettings: Bool

    @AppStorage("pollingInterval") private var pollingInterval: Double = BatteryMonitor
        .defaultPollingInterval

    @State private var telegramEnabled: Bool = false
    @State private var telegramIsLinked: Bool = false

    var body: some View {
        VStack {
            HStack {
                Button(action: { showSettings = false }) {
                    Image(systemName: "arrow.left")
                        .imageScale(.medium)
                }
                .buttonStyle(PlainButtonStyle())
                Text("Settings")
                Spacer()
            }
            .padding(.top, 20)
            .padding(.bottom, 10)

            VStack {
                HStack {

                    Picker("Polling Interval", selection: $pollingInterval) {
                        ForEach(Array(stride(from: 15, through: 60, by: 15)), id: \.self) { value in
                            Text("\(Int(value))s").tag(Double(value))
                        }
                    }
                    .onChange(of: pollingInterval) {
                        BatteryMonitor.shared.updatePollingInterval(pollingInterval)
                    }
                    .pickerStyle(MenuPickerStyle())
                }

                GroupBox(label: Text("")) {
                    HStack {
                        Spacer()
                        Toggle("Notify in Telegram", isOn: $telegramEnabled)
                            .toggleStyle(SwitchToggleStyle())
                            .controlSize(.small)
                        Spacer()
                    }
                    .padding([.top, .bottom], 5)

                    if !telegramIsLinked {
                        HStack {
                            Spacer()
                            Link("Connect Telegram", destination: URL(string: "https://t.me/your_bot")!)
                                .font(.headline)
                                .disabled(!telegramEnabled)
                            Spacer()
                        }
                        .opacity(telegramEnabled ? 1.0 : 0.5)
                    } else {
                        HStack {
                            Spacer()
                            Button("Unlink") {
                                self.telegramIsLinked = false
                            }
                            .buttonStyle(.bordered)
                            .controlSize(.large)
                            .disabled(!telegramEnabled)
                            Spacer()
                        }
                        .padding(.bottom, 5)
                        .opacity(telegramEnabled ? 1.0 : 0.5)
                    }
                }
            }
            .padding(.bottom, 20)
        }
        .padding([.leading, .trailing], 20)
        .onAppear {
            self.telegramIsLinked = false
        }
    }
}
