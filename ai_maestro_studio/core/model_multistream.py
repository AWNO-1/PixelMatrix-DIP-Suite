import torch
import torch.nn as nn

class MultiStreamGestureLSTM(nn.Module):
    def __init__(self, num_classes=100, hidden_dim=128, dropout=0.4):
        super().__init__()

        # Stream 1: Body pose (33 landmarks * 4 = 132 features)
        self.pose_lstm = nn.LSTM(
            input_size=33*4,
            hidden_size=hidden_dim,
            num_layers=2,
            batch_first=True,
            dropout=dropout,
            bidirectional=True
        )

        # Stream 2: Left hand (21 landmarks * 4 = 84 features)
        self.left_lstm = nn.LSTM(
            input_size=21*4,
            hidden_size=hidden_dim//2,
            num_layers=2,
            batch_first=True,
            dropout=dropout,
            bidirectional=True
        )

        # Stream 3: Right hand (21 landmarks * 4 = 84 features)
        self.right_lstm = nn.LSTM(
            input_size=21*4,
            hidden_size=hidden_dim//2,
            num_layers=2,
            batch_first=True,
            dropout=dropout,
            bidirectional=True
        )

        # Attention over LSTM outputs for each stream
        self.pose_attention  = nn.Linear(hidden_dim*2, 1)
        self.left_attention  = nn.Linear(hidden_dim, 1)
        self.right_attention = nn.Linear(hidden_dim, 1)

        # Fusion MLP
        # pose: hidden_dim*2, left: hidden_dim, right: hidden_dim
        fusion_dim = hidden_dim*2 + hidden_dim + hidden_dim  # 256+128+128 = 512... wait
        # hidden_dim=128: pose=256, left=128, right=128 to total=512
        self.fusion = nn.Sequential(
            nn.Linear(fusion_dim, 256),
            nn.BatchNorm1d(256),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(256, 128),
            nn.BatchNorm1d(128),
            nn.ReLU(),
            nn.Dropout(dropout)
        )
        self.classifier = nn.Linear(128, num_classes)

    def attend(self, lstm_out, attention_layer):
        # lstm_out: (B, T, H)
        # compute attention weights over time
        weights = torch.softmax(attention_layer(lstm_out), dim=1)  # (B, T, 1)
        return (lstm_out * weights).sum(dim=1)  # (B, H)

    def forward(self, x):
        # x: (B, 30, 75, 4) or (B, 30, 300). We handle both
        if x.dim() == 3:
            # reshape from (B, 30, 300) back to (B, 30, 75, 4)
            x = x.view(x.size(0), 30, 75, 4)

        # Split streams
        pose  = x[:, :, :33,  :].reshape(x.size(0), 30, -1)  # (B, 30, 132)
        left  = x[:, :, 33:54, :].reshape(x.size(0), 30, -1) # (B, 30, 84)
        right = x[:, :, 54:75, :].reshape(x.size(0), 30, -1) # (B, 30, 84)

        # Process each stream
        pose_out,  _ = self.pose_lstm(pose)   # (B, 30, 256)
        left_out,  _ = self.left_lstm(left)   # (B, 30, 128)
        right_out, _ = self.right_lstm(right) # (B, 30, 128)

        # Attention pooling
        pose_vec  = self.attend(pose_out,  self.pose_attention)   # (B, 256)
        left_vec  = self.attend(left_out,  self.left_attention)   # (B, 128)
        right_vec = self.attend(right_out, self.right_attention)  # (B, 128)

        # Fuse
        fused = torch.cat([pose_vec, left_vec, right_vec], dim=1)  # (B, 512)
        feats = self.fusion(fused)
        return self.classifier(feats)

    def freeze_features(self):
        for p in self.pose_lstm.parameters():  p.requires_grad = False
        for p in self.left_lstm.parameters():  p.requires_grad = False
        for p in self.right_lstm.parameters(): p.requires_grad = False
        for p in self.fusion.parameters():     p.requires_grad = False

    def unfreeze_features(self):
        for p in self.pose_lstm.parameters():  p.requires_grad = True
        for p in self.left_lstm.parameters():  p.requires_grad = True
        for p in self.right_lstm.parameters(): p.requires_grad = True
        for p in self.fusion.parameters():     p.requires_grad = True