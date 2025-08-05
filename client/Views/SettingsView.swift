import SwiftUI

struct SettingsView: View {
    @StateObject private var tgBinding = TgBinding.shared
    @Binding var showSettings: Bool

    @AppStorage("pollingInterval") private var pollingInterval: Double = BatteryMonitor
        .defaultPollingInterval
    @AppStorage("isTelegramEnabled") private var isTelegramEnabled: Bool = true

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
                        Toggle("Notify in Telegram", isOn: $isTelegramEnabled)
                            .toggleStyle(SwitchToggleStyle())
                            .controlSize(.small)
                        Spacer()
                    }
                    .padding([.top, .bottom], 5)

                    if !tgBinding.isLinked {
                        HStack {
                            Spacer()
                            Link("Connect Telegram", destination: TgBinding.shared.botLinkURL!)
                                .font(.headline)
                                .disabled(!isTelegramEnabled)
                            Spacer()
                        }
                        .opacity(isTelegramEnabled ? 1.0 : 0.5)
                    } else {
                        HStack {
                            Spacer()
                            Button("Unlink") {
                                //TODO: create unlink method in TgBingind
                            }
                            .buttonStyle(.bordered)
                            .controlSize(.large)
                            .disabled(!isTelegramEnabled)
                            Spacer()
                        }
                        .padding(.bottom, 5)
                        .opacity(isTelegramEnabled ? 1.0 : 0.5)
                    }
                }
            }
            .padding(.bottom, 20)
        }
        .padding([.leading, .trailing], 20)
    }
}
