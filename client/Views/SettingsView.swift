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
            
            HStack {
                Picker("Check battery every", selection: $pollingInterval) {
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
                
                VStack {
                    HStack {
                        Spacer()
                        Toggle("Notify in Telegram", isOn: $isTelegramEnabled)
                            .toggleStyle(SwitchToggleStyle())
                            .controlSize(.small)
                        Spacer()
                    }
                    .padding(.top, 5)
                    
                    Divider()
                        .padding(.horizontal, 20)
                        .padding(.bottom, 5)
                    
                    if tgBinding.linkedStatus == .unlinked {
                        
                        HStack {
                            
                            switch tgBinding.connectionState {
                            case .idle:
                                Button("Connect Telegram") { tgBinding.connectWebSocket() }
                            case .waitingForTelegram:
                                VStack {
                                    HStack(spacing: 8) {
                                        Image(systemName: "arrow.down.circle.fill")
                                            .foregroundColor(Color.gray.opacity(0.5))
                                            .imageScale(.large)
                                        
                                        Text("Click the link and then press Start in the bot")
                                            .foregroundColor(.secondary)
                                    }
                                    .padding(8)
                                    .background(Color.gray.opacity(0.2))
                                    .cornerRadius(10)
                                    .frame(maxWidth: 200)
                                    
                                    Link("Open Telegram", destination: TgBinding.shared.botLinkURL!)
                                        .font(.headline)
                                        .padding(.top, 5)
                                }
                            case .failed:
                                VStack {
                                    HStack(spacing: 8) {
                                        Image(systemName: "exclamationmark.circle")
                                            .foregroundColor(Color.gray.opacity(0.5))
                                            .imageScale(.large)
                                        
                                        Text("Connection failed")
                                            .foregroundColor(.secondary)
                                    }
                                    .padding(8)
                                    .background(Color.gray.opacity(0.2))
                                    .cornerRadius(10)
                                    .frame(maxWidth: 200)
                                    
                                    Button("Try again") { tgBinding.connectWebSocket() }
                                        .padding(.top, 5)
                                        .buttonStyle(.borderedProminent)
                                }
                            }
                        }
                        
                    }
                    
                    if tgBinding.linkedStatus == .linked {
                        VStack(spacing: 10) {
                            
                            HStack {
                                Text("Status:")
                                Image(systemName: "checkmark.circle.fill")
                                    .foregroundColor(.green)
                            }
                            
                            HStack {
                                Button("Unlink Account") {
                                    tgBinding.unlinkTelegram()
                                }
                                .controlSize(.regular)
                            }
                        }
                    }
                    
                    if tgBinding.linkedStatus == .unknown {
                        Text("Checking Linking")
                    }
                    
                    if tgBinding.linkedStatus == .error {
                        Text("Error while checking linking")
                    }
                    
                }
                .padding(.bottom, 10)
            }
        }
        .padding(.bottom, 20)
        .padding([.leading, .trailing], 20)
    }
}
